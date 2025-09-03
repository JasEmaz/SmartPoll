'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormSubmit,
} from '../../../../components/ui/form';
import { useAuth } from '@/app/contexts/auth';
import { createClient } from '@/lib/supabase/client';

interface PollOption {
  id: string;
  text: string;
}

interface FormErrors {
  question?: string;
  options?: string;
  general?: string;
}

export default function EditPollPage() {
  const router = useRouter();
  const params = useParams();
  const pollId = params?.id as string;
  const { user } = useAuth();
  const supabase = createClient();

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<PollOption[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalData, setOriginalData] = useState<{ question: string; options: PollOption[] } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    async function fetchPoll() {
      try {
        const { data, error } = await supabase
          .from('polls')
          .select('*, poll_options(*)')
          .eq('id', pollId)
          .single();

        if (error) throw error;

        if (data.user_id !== user?.id) {
          setErrors({ general: 'You are not authorized to edit this poll.' });
          return;
        }

        const pollOptions = data.poll_options.map((o: {
          id: string;
          option_text: string;
        }) => ({ id: o.id, text: o.option_text }));
        setQuestion(data.question);
        setOptions(pollOptions);
        setOriginalData({ question: data.question, options: pollOptions });
      } catch (error) {
        console.error('Error fetching poll:', error);
        setErrors({ general: 'Failed to load poll' });
      } finally {
        setLoading(false);
      }
    }

    if (user && pollId) {
      fetchPoll();
    }
  }, [user, pollId, supabase]);

  // Early return if no pollId
  if (!pollId) {
    return (
      <div className="max-w-2xl mx-auto py-8 text-center">
        <div className="bg-destructive/15 text-destructive text-sm p-4 rounded-md mb-4">
          Invalid poll ID
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const addOption = () => {
    const newId = `new_${Date.now()}`;
    setOptions([...options, { id: newId, text: '' }]);
    setErrors({ ...errors, options: undefined });
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) {
      setErrors({ ...errors, options: 'A poll must have at least 2 options' });
      return;
    }
    
    setOptions(options.filter(option => option.id !== id));
    setErrors({ ...errors, options: undefined });
  };

  const updateOption = (id: string, text: string) => {
    setOptions(
      options.map(option => {
        if (option.id === id) {
          return { ...option, text };
        }
        return option;
      })
    );
    setErrors({ ...errors, options: undefined });
  };

  const moveOption = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= options.length) return;
    
    const newOptions = [...options];
    const [movedOption] = newOptions.splice(fromIndex, 1);
    newOptions.splice(toIndex, 0, movedOption);
    setOptions(newOptions);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!question.trim()) {
      newErrors.question = 'Poll question is required';
    }

    const validOptions = options.filter(option => option.text.trim());
    if (validOptions.length < 2) {
      newErrors.options = 'Please provide at least 2 valid options';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    return true;
  };

  const hasChanges = () => {
    if (!originalData) return false;
    return (
      question !== originalData.question ||
      JSON.stringify(options) !== JSON.stringify(originalData.options)
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!validateForm()) return;

    if (!hasChanges()) {
      router.push('/dashboard');
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      // Update poll question
      const { error: pollError } = await supabase
        .from('polls')
        .update({ question })
        .eq('id', pollId);

      if (pollError) throw pollError;

      // Update existing options
      const existingOptions = options.filter(option => !option.id.startsWith('new_'));
      const newOptions = options.filter(option => option.id.startsWith('new_'));

              // Update existing options
        for (const option of existingOptions) {
          const { error } = await supabase
            .from('poll_options')
            .update({ option_text: option.text })
            .eq('id', option.id);
          
          if (error) throw error;
        }

      // Add new options
      if (newOptions.length > 0) {
        const optionsToInsert = newOptions.map(option => ({
          poll_id: pollId,
          option_text: option.text,
          votes: 0
        }));

        const { error: insertError } = await supabase
          .from('poll_options')
          .insert(optionsToInsert);

        if (insertError) throw insertError;
      }

      router.push('/dashboard');
    } catch (error) {
      console.error('Error updating poll:', error);
      setErrors({ general: 'Failed to update poll. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges()) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        router.back();
      }
    } else {
      router.back();
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (errors.general) {
    return (
      <div className="max-w-2xl mx-auto py-8 text-center">
        <div className="bg-destructive/15 text-destructive text-sm p-4 rounded-md mb-4">
          {errors.general}
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <Link href={`/polls/${pollId}`} className="hover:text-foreground transition-colors">
          View Poll
        </Link>
        <span>/</span>
        <span className="text-foreground">Edit</span>
      </nav>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Edit Poll</h1>
        <p className="text-muted-foreground">
          Make changes to your poll question and options. Changes will be saved immediately.
        </p>
      </div>

      {errors.general && (
        <div className="bg-destructive/15 text-destructive text-sm p-4 rounded-md">
          {errors.general}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Edit Form */}
        <div>
          <Form onSubmit={handleSubmit}>
            <FormItem>
              <FormLabel htmlFor="question">Poll Question</FormLabel>
              <FormControl>
                <Textarea
                  id="question"
                  value={question}
                  onChange={(e) => {
                    setQuestion(e.target.value);
                    setErrors({ ...errors, question: undefined });
                  }}
                  placeholder="What would you like to ask?"
                  className="min-h-20"
                  required
                />
              </FormControl>
              {errors.question && <FormMessage>{errors.question}</FormMessage>}
              <FormDescription>
                Be clear and specific with your question.
              </FormDescription>
            </FormItem>

            <div className="space-y-4 mt-8">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Poll Options</h2>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addOption}
                  size="sm"
                >
                  Add Option
                </Button>
              </div>
              
              {errors.options && (
                <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                  {errors.options}
                </div>
              )}

              <div className="space-y-3">
                {options.map((option, index) => (
                  <div key={option.id} className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => moveOption(index, index - 1)}
                        disabled={index === 0}
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                        title="Move up"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m18 15-6-6-6 6"/>
                        </svg>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => moveOption(index, index + 1)}
                        disabled={index === options.length - 1}
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                        title="Move down"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </Button>
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option.text}
                        onChange={(e) => updateOption(option.id, e.target.value)}
                        required
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(option.id)}
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={options.length <= 2}
                      title="Remove option"
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
            </div>

            <div className="flex justify-between items-center pt-6 border-t mt-8">
              <div className="text-sm text-muted-foreground">
                {hasChanges() ? 'You have unsaved changes' : 'No changes made'}
              </div>
              
              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <FormSubmit disabled={saving || !hasChanges()}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </FormSubmit>
              </div>
            </div>
          </Form>
        </div>

        {/* Preview Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Preview</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
          </div>

          {showPreview && (
            <div className="border rounded-lg p-6 space-y-4 bg-muted/30">
              <h3 className="text-lg font-medium">{question || 'Your poll question will appear here'}</h3>
              
              <div className="space-y-3">
                {options.map((option, index) => (
                  <div key={option.id} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border border-muted-foreground"></div>
                    <span className={option.text ? 'text-foreground' : 'text-muted-foreground'}>
                      {option.text || `Option ${index + 1}`}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {options.filter(o => o.text.trim()).length} of {options.length} options filled
                </p>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Quick Actions</h3>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push(`/polls/${pollId}`)}
                className="justify-start"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                View Poll
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="justify-start"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
