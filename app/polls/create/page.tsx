'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDropzone } from 'react-dropzone';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '../../../components/ui/form';
import { useAuth } from '@/app/contexts/auth';
import { createClient } from '@/lib/supabase/client';
import { SharePoll } from '../../../components/polls';
import {
  ValidationSchemas,
  InputSanitizer,
  FileValidator,
  ErrorSanitizer,
  RateLimiter,
  SECURITY_CONFIG
} from '@/lib/security';
import type { z } from 'zod';

// Type for our form data
type CreatePollFormData = z.infer<typeof ValidationSchemas.createPoll>;

/**
 * SECURITY FEATURES IMPLEMENTED:
 * 
 * 1. INPUT SANITIZATION: DOMPurify removes ALL HTML tags and dangerous characters
 * 2. VALIDATION: Zod schema validation with strict typing and length limits
 * 3. FILE UPLOAD SECURITY: MIME type, size, and magic byte validation
 * 4. ERROR HANDLING: Error sanitization removes sensitive information
 * 5. RATE LIMITING: Prevents spam and abuse
 * 6. ACCESS CONTROL: Authentication required with session validation
 */

export default function CreatePollPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const [success, setSuccess] = useState(false);
  const [createdPoll, setCreatedPoll] = useState<{ id: string; question: string } | null>(null);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Initialize form with react-hook-form and Zod validation
  const form = useForm<CreatePollFormData>({
    resolver: zodResolver(ValidationSchemas.createPoll),
    defaultValues: {
      question: '',
      options: [
        { text: '', id: '1' },
        { text: '', id: '2' }
      ],
      expiresAt: '',
    },
    mode: 'onChange' // Real-time validation
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'options'
  });
  // Secure file upload handler with magic byte validation
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    // Validate file security
    const validation = FileValidator.validateFile(file);
    if (!validation.isValid) {
      form.setError('image', { 
        type: 'manual', 
        message: validation.error! 
      });
      return;
    }

    // Additional security: Check file content (magic bytes)
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (buffer) {
        const bytes = new Uint8Array(buffer.slice(0, 4));
        const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        
        // Check magic bytes for common image formats
        const validMagicBytes = [
          'ffd8ff', // JPEG
          '89504e', // PNG  
          '47494638', // GIF
          '52494646' // WebP (RIFF)
        ];
        
        const isValidImage = validMagicBytes.some(magic => hex.startsWith(magic));
        if (!isValidImage) {
          form.setError('image', { 
            type: 'manual', 
            message: 'File is not a valid image' 
          });
          return;
        }
        
        setUploadedImage(file);
        setImagePreview(URL.createObjectURL(file));
        form.clearErrors('image');
      }
    };
    reader.readAsArrayBuffer(file);
  }, [form]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp']
    },
    maxSize: SECURITY_CONFIG.FILE_UPLOAD.MAX_SIZE,
    multiple: false
  });

  const addOption = () => {
    if (fields.length < SECURITY_CONFIG.TEXT_LIMITS.MAX_OPTIONS) {
      append({ text: '', id: (fields.length + 1).toString() });
    }
  };

  const removeOption = (index: number) => {
    if (fields.length > SECURITY_CONFIG.TEXT_LIMITS.MIN_OPTIONS) {
      remove(index);
    }
  };
  
  const onSubmit = async (data: CreatePollFormData) => {
    // Authentication check
    if (!user) {
      form.setError('root', { 
        type: 'manual', 
        message: 'Authentication required' 
      });
      return;
    }

    // Rate limiting check
    const isRateLimited = RateLimiter.isRateLimited(
      user.id, 
      SECURITY_CONFIG.RATE_LIMITS.POLL_CREATION, 
      60 * 60 * 1000 // 1 hour window
    );
    
    if (isRateLimited) {
      form.setError('root', { 
        type: 'manual', 
        message: 'Too many polls created. Please wait before creating another.' 
      });
      return;
    }

    try {
      // Data is already sanitized by Zod transforms
      const sanitizedData = {
        question: data.question, // Already sanitized
        options: data.options.filter(opt => opt.text.trim()), // Remove empty options
        expiresAt: data.expiresAt || null
      };

      // Validate final data structure
      if (sanitizedData.options.length < SECURITY_CONFIG.TEXT_LIMITS.MIN_OPTIONS) {
        throw new Error(`At least ${SECURITY_CONFIG.TEXT_LIMITS.MIN_OPTIONS} options required`);
      }

      // Create poll in database
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert({
          question: sanitizedData.question,
          user_id: user.id,
          expires_at: sanitizedData.expiresAt,
        })
        .select()
        .single();

      if (pollError) {
        throw pollError;
      }

      // Create poll options
      const optionsToInsert = sanitizedData.options.map(option => ({
        poll_id: poll.id,
        option_text: option.text,
        votes: 0
      }));

      const { error: optionsError } = await supabase
        .from('poll_options')
        .insert(optionsToInsert);

      if (optionsError) {
        throw optionsError;
      }

      // Handle image upload if present
      if (uploadedImage && user) {
        const secureFilename = FileValidator.generateSecureFilename(
          uploadedImage.name, 
          user.id
        );
        
        const { error: uploadError } = await supabase.storage
          .from('poll-images')
          .upload(secureFilename, uploadedImage, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          // Don't fail the poll creation if image upload fails
          console.warn('Image upload failed:', ErrorSanitizer.sanitizeError(uploadError));
        }
      }

      setCreatedPoll({ 
        id: poll.id, 
        question: sanitizedData.question 
      });
      setSuccess(true);

    } catch (error) {
      // Sanitize error for client display
      const safeError = ErrorSanitizer.sanitizeError(error);
      
      form.setError('root', { 
        type: 'manual', 
        message: safeError
      });
    }
  };

  if (success && createdPoll) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-8">
        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="h-16 w-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-green-600">Poll Created Successfully!</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Your poll &quot;{InputSanitizer.sanitizeText(createdPoll.question)}&quot; is now live and ready to receive votes.
            Share it with your audience using the options below.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={() => router.push(`/polls/${createdPoll.id}`)}
            size="lg"
          >
            View Poll
          </Button>
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard')}
            size="lg"
          >
            Go to Dashboard
          </Button>
        </div>

        {/* Share Section */}
        <div className="max-w-2xl mx-auto">
          <SharePoll pollId={createdPoll.id} pollQuestion={createdPoll.question} />
        </div>
        
        {/* Additional Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Your poll URL: <code className="bg-muted px-2 py-1 rounded">
            {typeof window !== 'undefined' ? 
              InputSanitizer.sanitizeUrl(`${window.location.origin}/polls/${createdPoll.id}`) : 
              ''
            }
          </code></p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Create a New Poll</h1>
        <p className="text-muted-foreground">
          Create a secure poll with validation and content filtering.
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Root error display */}
          {form.formState.errors.root && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
              {form.formState.errors.root.message}
            </div>
          )}
          {/* Question Field */}
          <FormItem>
            <FormLabel htmlFor="question">Poll Question *</FormLabel>
            <FormControl>
              <Textarea
                id="question"
                placeholder="What would you like to ask? (HTML tags will be removed)"
                {...form.register('question')}
                className="min-h-20"
              />
            </FormControl>
            <FormDescription>
              Be clear and specific. Maximum {SECURITY_CONFIG.TEXT_LIMITS.POLL_QUESTION_MAX} characters.
              {form.watch('question') && (
                <span className={`ml-2 ${
                  form.watch('question').length > SECURITY_CONFIG.TEXT_LIMITS.POLL_QUESTION_MAX ? 'text-red-500' : 'text-muted-foreground'
                }`}>
                  ({form.watch('question').length}/{SECURITY_CONFIG.TEXT_LIMITS.POLL_QUESTION_MAX})
                </span>
              )}
            </FormDescription>
            <FormMessage />
          </FormItem>

          {/* Expiration Date */}
          <FormItem>
            <FormLabel htmlFor="expiresAt">Expiration Date (Optional)</FormLabel>
            <FormControl>
              <Input
                id="expiresAt"
                type="datetime-local"
                {...form.register('expiresAt')}
              />
            </FormControl>
            <FormDescription>
              The poll will automatically close at this time.
            </FormDescription>
            <FormMessage />
          </FormItem>

          {/* Image Upload */}
          <FormItem>
            <FormLabel>Poll Image (Optional)</FormLabel>
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              {imagePreview ? (
                <div className="space-y-2">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="max-h-32 mx-auto rounded"
                    onError={() => {
                      setImagePreview(null);
                      setUploadedImage(null);
                    }}
                  />
                  <p className="text-sm text-muted-foreground">
                    {uploadedImage?.name} ({Math.round((uploadedImage?.size || 0) / 1024)}KB)
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setImagePreview(null);
                      setUploadedImage(null);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="mx-auto w-12 h-12 text-gray-400">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isDragActive ? 'Drop image here...' : 'Click or drag image to upload'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, GIF, WebP • Max {SECURITY_CONFIG.FILE_UPLOAD.MAX_SIZE / (1024 * 1024)}MB
                  </p>
                </div>
              )}
            </div>
            <FormMessage />
          </FormItem>
        
        <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Poll Options *</h2>
              <Button 
                type="button" 
                variant="outline" 
                onClick={addOption}
                size="sm"
                disabled={fields.length >= SECURITY_CONFIG.TEXT_LIMITS.MAX_OPTIONS}
              >
                Add Option ({fields.length}/{SECURITY_CONFIG.TEXT_LIMITS.MAX_OPTIONS})
              </Button>
            </div>
            
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder={`Option ${index + 1} (HTML will be stripped)`}
                      {...form.register(`options.${index}.text`)}
                    />
                    {form.formState.errors.options?.[index]?.text && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.options[index]?.text?.message}
                      </p>
                    )}
                    {form.watch(`options.${index}.text`) && (
                      <p className={`text-xs mt-1 ${
                        form.watch(`options.${index}.text`).length > SECURITY_CONFIG.TEXT_LIMITS.POLL_OPTION_MAX 
                          ? 'text-red-500' : 'text-muted-foreground'
                      }`}>
                        {form.watch(`options.${index}.text`).length}/{SECURITY_CONFIG.TEXT_LIMITS.POLL_OPTION_MAX}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(index)}
                    className="h-9 w-9 shrink-0"
                    disabled={fields.length <= SECURITY_CONFIG.TEXT_LIMITS.MIN_OPTIONS}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                  </Button>
                </div>
              ))}
            </div>
            
            {form.formState.errors.options?.root && (
              <p className="text-sm text-red-500">
                {form.formState.errors.options.root.message}
              </p>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={form.formState.isSubmitting || !form.formState.isValid}
            >
              {form.formState.isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating...
                </>
              ) : (
                'Create Secure Poll'
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Security Notice */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">🔒 Security Features Active</h3>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Input sanitization removes HTML tags and malicious scripts</li>
          <li>• File uploads restricted to images only with size limits</li>
          <li>• Real-time validation prevents invalid data submission</li>
          <li>• Rate limiting prevents spam and abuse</li>
        </ul>
      </div>
    </div>
  );
}