'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';

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
  createdBy: string;
  createdAt: string;
}

export default function PollPage() {
  const params = useParams();
  const pollId = params.id as string;
  
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // In a real app, this would fetch from Supabase
    // For now, we'll use mock data
    const mockPoll: Poll = {
      id: pollId,
      question: 'What is your favorite programming language?',
      options: [
        { id: '1', text: 'JavaScript', votes: 42 },
        { id: '2', text: 'Python', votes: 35 },
        { id: '3', text: 'TypeScript', votes: 28 },
        { id: '4', text: 'Rust', votes: 15 },
      ],
      totalVotes: 120,
      createdBy: 'user@example.com',
      createdAt: new Date().toISOString(),
    };
    
    // Simulate API delay
    setTimeout(() => {
      setPoll(mockPoll);
      setLoading(false);
    }, 500);
    
    // TODO: Replace with actual Supabase fetch
    // async function fetchPoll() {
    //   try {
    //     const { data, error } = await supabase
    //       .from('polls')
    //       .select('*, options(*)')
    //       .eq('id', pollId)
    //       .single();
    //     
    //     if (error) throw error;
    //     setPoll(data);
    //   } catch (error) {
    //     console.error('Error fetching poll:', error);
    //     setError('Failed to load poll');
    //   } finally {
    //     setLoading(false);
    //   }
    // }
    // 
    // fetchPoll();
  }, [pollId]);
  
  const handleVote = async () => {
    if (!selectedOption) return;
    
    try {
      // TODO: Implement Supabase vote submission
      // const { error } = await supabase.rpc('increment_vote', {
      //   option_id: selectedOption,
      //   poll_id: pollId
      // });
      // 
      // if (error) throw error;
      
      // For now, just update the UI
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
      setError('Failed to submit vote');
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  if (error || !poll) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold text-destructive">
          {error || 'Poll not found'}
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
          Created {new Date(poll.createdAt).toLocaleDateString()}
          {' · '}
          {poll.totalVotes} votes
        </p>
      </div>
      
      {!hasVoted ? (
        <div className="space-y-4">
          <div className="space-y-2">
            {poll.options.map((option) => (
              <div 
                key={option.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedOption === option.id ? 'border-primary bg-primary/5' : 'hover:bg-accent'}`}
                onClick={() => setSelectedOption(option.id)}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border ${selectedOption === option.id ? 'border-4 border-primary' : 'border-muted-foreground'}`}></div>
                  <span>{option.text}</span>
                </div>
              </div>
            ))}
          </div>
          
          <Button 
            onClick={handleVote} 
            disabled={!selectedOption}
            className="w-full"
          >
            Submit Vote
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Results</h2>
          
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