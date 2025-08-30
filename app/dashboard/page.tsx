'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../../components/ui/card';

interface Poll {
  id: string;
  question: string;
  totalVotes: number;
  createdAt: string;
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const createdPoll = searchParams.get('created');
  
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // In a real app, this would fetch from Supabase
    // For now, we'll use mock data
    const mockPolls: Poll[] = [
      {
        id: '1',
        question: 'What is your favorite programming language?',
        totalVotes: 120,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        question: 'Which frontend framework do you prefer?',
        totalVotes: 85,
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      },
      {
        id: '3',
        question: 'How often do you deploy to production?',
        totalVotes: 42,
        createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      },
    ];
    
    // Simulate API delay
    setTimeout(() => {
      setPolls(mockPolls);
      setLoading(false);
    }, 500);
    
    // TODO: Replace with actual Supabase fetch
    // async function fetchPolls() {
    //   try {
    //     const { data, error } = await supabase
    //       .from('polls')
    //       .select('id, question, created_at, total_votes')
    //       .eq('created_by', user.id)
    //       .order('created_at', { ascending: false });
    //     
    //     if (error) throw error;
    //     setPolls(data || []);
    //   } catch (error) {
    //     console.error('Error fetching polls:', error);
    //   } finally {
    //     setLoading(false);
    //   }
    // }
    // 
    // fetchPolls();
  }, []);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your Polls</h1>
        <Button asChild>
          <Link href="/polls/create">Create New Poll</Link>
        </Button>
      </div>
      
      {createdPoll && (
        <div className="bg-green-50 text-green-700 p-4 rounded-md border border-green-200">
          Poll created successfully! Share it with others to start collecting responses.
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : polls.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {polls.map((poll) => (
            <Card key={poll.id} className="overflow-hidden">
              <CardHeader>
                <CardTitle className="line-clamp-2">{poll.question}</CardTitle>
                <CardDescription>
                  Created {new Date(poll.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <span className="text-sm text-muted-foreground">
                    {poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/polls/${poll.id}`}>View Results</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/polls/${poll.id}/share`}>Share</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 space-y-4">
          <h2 className="text-xl font-semibold">No polls yet</h2>
          <p className="text-muted-foreground">
            Create your first poll to start collecting responses.
          </p>
          <Button asChild className="mt-4">
            <Link href="/polls/create">Create Your First Poll</Link>
          </Button>
        </div>
      )}
    </div>
  );
}