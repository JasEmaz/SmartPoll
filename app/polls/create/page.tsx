'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
} from '../../../components/ui/form';
import { useAuth } from '@/app/contexts/auth';
import { createClient } from '@/lib/supabase/client';
import { SharePoll } from '../../../components/polls';

interface PollOption {
  id: string;
  text: string;
}

export default function CreatePollPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<PollOption[]>([
    { id: '1', text: '' },
    { id: '2', text: '' },
  ]);
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdPoll, setCreatedPoll] = useState<{ id: string; question: string } | null>(null);
  
  const addOption = () => {
    const newId = (options.length + 1).toString();
    setOptions([...options, { id: newId, text: '' }]);
  };
  
  const removeOption = (id: string) => {
    if (options.length <= 2) {
      setError('A poll must have at least 2 options');
      return;
    }
    
    setOptions(options.filter(option => option.id !== id));
    setError(null);
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
  };
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    if (!user) {
      setError('You must be logged in to create a poll.');
      setIsSubmitting(false);
      return;
    }

    // Validate form
    if (!question.trim()) {
      setError('Please enter a question');
      setIsSubmitting(false);
      return;
    }
    
    const validOptions = options.filter(option => option.text.trim());
    if (validOptions.length < 2) {
      setError('Please provide at least 2 valid options');
      setIsSubmitting(false);
      return;
    }

    if (expiresAt && new Date(expiresAt) < new Date()) {
      setError('Expiration date cannot be in the past');
      setIsSubmitting(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('polls')
        .insert({
          question,
          user_id: user.id,
          expires_at: expiresAt || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const pollId = data.id;
      
      const optionsToInsert = validOptions.map(option => ({
        poll_id: pollId,
        option_text: option.text,
      }));
      
      const { error: optionsError } = await supabase
        .from('poll_options')
        .insert(optionsToInsert);
      
      if (optionsError) throw optionsError;
      
      setCreatedPoll({ id: pollId, question });
      setSuccess(true);
    } catch (error) {
      console.error('Error creating poll:', JSON.stringify(error, null, 2));
      setError('Failed to create poll');
      setIsSubmitting(false);
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
            Your poll "{createdPoll.question}" is now live and ready to receive votes.
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
          <p>Your poll URL: <code className="bg-muted px-2 py-1 rounded">{typeof window !== 'undefined' ? `${window.location.origin}/polls/${createdPoll.id}` : ''}</code></p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Create a New Poll</h1>
        <p className="text-muted-foreground">
          Create a poll with a question and multiple options for people to vote on.
        </p>
      </div>
      
      {error && (
        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}
      
      <Form onSubmit={handleSubmit}>
        <FormItem>
          <FormLabel htmlFor="question">Poll Question</FormLabel>
          <FormControl>
            <Textarea
              id="question"
              placeholder="What would you like to ask?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-20"
              required
            />
          </FormControl>
          <FormDescription>
            Be clear and specific with your question.
          </FormDescription>
        </FormItem>

        <FormItem className="mt-6">
          <FormLabel htmlFor="expiresAt">Expiration Date (Optional)</FormLabel>
          <FormControl>
            <Input
              id="expiresAt"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </FormControl>
          <FormDescription>
            The poll will automatically close at this time.
          </FormDescription>
        </FormItem>
        
        <div className="space-y-4 mt-6">
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
          
          <div className="space-y-3">
            {options.map((option, index) => (
              <div key={option.id} className="flex items-center gap-2">
                <Input
                  placeholder={`Option ${index + 1}`}
                  value={option.text}
                  onChange={(e) => updateOption(option.id, e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(option.id)}
                  className="h-9 w-9 shrink-0"
                  disabled={options.length <= 2}
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
        
        <div className="flex justify-end gap-4 mt-8">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Creating...
              </>
            ) : (
              'Create Poll'
            )}
          </Button>
        </div>
      </Form>
    </div>
  );
}