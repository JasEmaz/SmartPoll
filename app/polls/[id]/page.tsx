'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/contexts/auth';

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  user_id: string;
  created_at: string;
}

const mockPoll: Poll = {
  id: '1',
  question: 'What is your favorite programming language?',
  options: [
    { id: '1', text: 'JavaScript', votes: 3 },
    { id: '2', text: 'Python', votes: 5 },
    { id: '3', text: 'Rust', votes: 2 },
  ],
  totalVotes: 10,
  user_id: 'mock_user',
  created_at: new Date().toISOString(),
};

export default function PollPage() {
  const params = useParams();
  const pollId = params.id as string;
  const supabase = createClient();
  const { user } = useAuth();
  
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingVoteStatus, setCheckingVoteStatus] = useState(false);
  
  useEffect(() => {
    async function fetchPoll() {
      try {
        const { data, error } = await supabase
          .from('polls')
          .select('id, question, created_at, user_id, poll_options(*)')
          .eq('id', pollId)
          .single();
        
        if (error) throw error;
        
        const formattedPoll: Poll = {
          id: data.id,
          question: data.question,
          options: data.poll_options.map((option: any) => ({
            id: option.id,
            text: option.option_text,
            votes: option.votes || 0
          })),
          totalVotes: data.poll_options.reduce((acc: number, option: any) => acc + (option.votes || 0), 0),
          user_id: data.user_id,
          created_at: data.created_at
        };
        
        setPoll(formattedPoll);
        
        // Check if user has already voted
        if (user) {
          await checkVoteStatus();
        }
      } catch (error) {
        console.error('Error fetching poll:', error);
        setError('Failed to load poll. Displaying mock data instead.');
        setPoll(mockPoll);
      } finally {
        setLoading(false);
      }
    }
    
    if (pollId) {
      fetchPoll();
    }
  }, [pollId, supabase, user]);

  const checkVoteStatus = async () => {
    if (!user || !pollId) return;
    
    setCheckingVoteStatus(true);
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('option_id')
        .eq('user_id', user.id)
        .eq('poll_id', pollId)
        .single();
      
      if (!error && data) {
        setHasVoted(true);
        setSelectedOption(data.option_id);
      }
    } catch (error) {
      // User hasn't voted yet, which is fine
    } finally {
      setCheckingVoteStatus(false);
    }
  };
  
  const handleVote = async () => {
    if (!selectedOption) return;
    
    if (!user) {
      setError('You must be logged in to vote.');
      return;
    }

    try {
      // Use the increment_vote function to prevent double voting and update vote count atomically
      const { error } = await supabase.rpc('increment_vote', {
        option_id: selectedOption,
        poll_id: pollId,
        user_id: user.id
      });

      if (error) {
        if (error.message.includes('already voted')) {
          setError('You have already voted on this poll.');
        } else {
          throw error;
        }
        return;
      }
      
      // Update the UI
      if (poll) {
        const updatedOptions = poll.options.map(option => {
          if (option.id === selectedOption) {
            return { ...option, votes: option.votes + 1 };
          }
          return option;
        });
        
        setPoll({
          ...poll,
          options: updatedOptions,
          totalVotes: poll.totalVotes + 1,
        });
        
        setHasVoted(true);
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      setError('Failed to submit vote. Please try again.');
    }
  };
  
  if (loading || checkingVoteStatus) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  if (!poll) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold text-destructive">
          Poll not found
        </h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold text-destructive">
          {error}
        </h1>
      </div>
    );
  }
  
  // Calculate percentages for the chart
  const getPercentage = (votes: number) => {
    return poll.totalVotes > 0 ? Math.round((votes / poll.totalVotes) * 100) : 0;
  };
  
  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{poll.question}</h1>
        <p className="text-muted-foreground">
          Created {new Date(poll.created_at).toLocaleDateString()}
          {' · '}
          {poll.totalVotes} votes
        </p>
      </div>
      
      {!hasVoted ? (
        <div className="space-y-4">
          {!user && (
            <div className="bg-blue-50 text-blue-700 p-4 rounded-md border border-blue-200">
              <p className="text-sm">
                Please <a href="/auth/login" className="underline font-medium">log in</a> to vote on this poll.
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            {poll.options.map((option) => (
              <div 
                key={option.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedOption === option.id ? 'border-primary bg-primary/5' : 'hover:bg-accent'} ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => user && setSelectedOption(option.id)}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border ${selectedOption === option.id ? 'border-4 border-primary' : 'border-muted-foreground'}`}></div>
                  <span>{option.text}</span>
                </div>
              </div>
            ))}
          </div>
          
          {user ? (
            <Button 
              onClick={handleVote} 
              disabled={!selectedOption}
              className="w-full"
            >
              Submit Vote
            </Button>
          ) : (
            <Button 
              asChild
              className="w-full"
            >
              <a href="/auth/login">Log In to Vote</a>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Thank you for voting!</h2>
          <h3 className="text-lg font-semibold">Results</h3>
          
          <div className="space-y-3">
            {poll.options.map((option) => {
              const percentage = getPercentage(option.votes);
              return (
                <div key={option.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{option.text}</span>
                    <span className="font-medium">{percentage}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground">{option.votes} votes</p>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" asChild>
              <a href={`/polls/${pollId}/share`}>Share Poll</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/dashboard">Back to Dashboard</a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}