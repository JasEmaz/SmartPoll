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
  FormSubmit,
} from '../../../components/ui/form';

interface PollOption {
  id: string;
  text: string;
}

export default function CreatePollPage() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<PollOption[]>([
    { id: '1', text: '' },
    { id: '2', text: '' },
  ]);
  const [error, setError] = useState<string | null>(null);
  
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
    
    // Validate form
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }
    
    const validOptions = options.filter(option => option.text.trim());
    if (validOptions.length < 2) {
      setError('Please provide at least 2 valid options');
      return;
    }
    
    try {
      // TODO: Implement Supabase poll creation
      // const { data, error } = await supabase
      //   .from('polls')
      //   .insert({
      //     question,
      //     created_by: user.id,
      //   })
      //   .select()
      //   .single();
      // 
      // if (error) throw error;
      // 
      // const pollId = data.id;
      // 
      // const optionsToInsert = validOptions.map(option => ({
      //   poll_id: pollId,
      //   text: option.text,
      //   votes: 0,
      // }));
      // 
      // const { error: optionsError } = await supabase
      //   .from('poll_options')
      //   .insert(optionsToInsert);
      // 
      // if (optionsError) throw optionsError;
      
      // For now, just simulate success and redirect
      router.push('/dashboard?created=true');
    } catch (error) {
      console.error('Error creating poll:', error);
      setError('Failed to create poll');
    }
  };
  
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
            {options.map((option) => (
              <div key={option.id} className="flex items-center gap-2">
                <Input
                  placeholder={`Option ${option.id}`}
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
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <FormSubmit>Create Poll</FormSubmit>
        </div>
      </Form>
    </div>
  );
}