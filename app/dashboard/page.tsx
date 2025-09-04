import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../../components/ui/card';
import { DashboardSharePoll } from '@/components/polls/DashboardSharePoll';
import { getUserPolls } from '@/app/actions/poll-actions';
import { DeletePollButton } from '@/components/polls/DeletePollButton';
import { Clock, CheckCircle2, LogOut, User } from 'lucide-react';
import { getAuthenticatedUser } from '@/lib/supabase';
import { LogoutButton } from '@/components/auth/LogoutButton';

interface Poll {
  id: string;
  question: string;
  totalVotes: number;
  created_at: string;
  expires_at: string | null;
  user_id: string;
  isExpired: boolean;
  status: 'ongoing' | 'expired';
}

interface DashboardPageProps {
  searchParams: { created?: string };
}

/**
 * SECURITY IMPLEMENTATION:
 * 
 * 1. SERVER-SIDE AUTHENTICATION: getAuthenticatedUser() validates session server-side
 * 2. AUTOMATIC REDIRECT: Unauthenticated users redirected to login
 * 3. USER CONTEXT: User data available throughout component
 * 4. SECURE DATA FETCHING: All data fetched with authenticated context
 */

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  // SECURITY: Server-side authentication check
  const user = await getAuthenticatedUser();
  
  // Redirect if not authenticated (defense in depth - middleware should handle this)
  if (!user) {
    redirect('/auth/login?redirect=/dashboard');
  }
  
  const createdPoll = searchParams.created;
  
  // Fetch polls on the server with authenticated context
  const pollsResult = await getUserPolls();
  
  if (!pollsResult.success) {
    return (
      <div className="space-y-6">
        {/* Header with user info and logout */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Your Polls</h1>
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
              <User className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-600">{user.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild>
              <Link href="/polls/create">Create New Poll</Link>
            </Button>
            <LogoutButton />
          </div>
        </div>
        <div className="text-center py-12 space-y-4">
          <h2 className="text-xl font-semibold text-red-600">Error Loading Polls</h2>
          <p className="text-muted-foreground">
            Failed to load your polls. Please try again.
          </p>
        </div>
      </div>
    );
  }

  const { ongoingPolls, expiredPolls } = pollsResult.data!;
  const hasPolls = ongoingPolls.length > 0 || expiredPolls.length > 0;

  const formatExpiryDate = (expiresAt: string | null) => {
    if (!expiresAt) return 'No expiry';
    return new Date(expiresAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const PollCard = ({ poll }: { poll: Poll }) => (
    <Card 
      key={poll.id} 
      className={`
        overflow-hidden transition-all duration-200 hover:shadow-md
        ${
          poll.isExpired 
            ? 'bg-red-50 border-red-200 text-red-900'
            : 'bg-green-50 border-green-200 text-green-900'
        }
      `}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className={`
            line-clamp-2 text-base leading-tight
            ${poll.isExpired ? 'text-red-800' : 'text-green-800'}
          `}>
            {poll.question}
          </CardTitle>
          <div className={`
            flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium shrink-0
            ${poll.isExpired 
              ? 'bg-red-100 text-red-700 border border-red-300'
              : 'bg-green-100 text-green-700 border border-green-300'
            }
          `}>
            {poll.isExpired ? (
              <><Clock className="h-3 w-3" /> Expired</>
            ) : (
              <><CheckCircle2 className="h-3 w-3" /> Active</>
            )}
          </div>
        </div>
        <CardDescription className={`
          text-sm
          ${poll.isExpired ? 'text-red-600' : 'text-green-600'}
        `}>
          Created {new Date(poll.created_at).toLocaleDateString()}
          {poll.expires_at && (
            <span className="block">
              {poll.isExpired ? 'Expired' : 'Expires'}: {formatExpiryDate(poll.expires_at)}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex items-center gap-2">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={poll.isExpired ? 'text-red-500' : 'text-green-500'}
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span className={`
            text-sm font-medium
            ${poll.isExpired ? 'text-red-700' : 'text-green-700'}
          `}>
            {poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-3 border-t border-current/10">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            asChild
            className={`
              ${poll.isExpired 
                ? 'border-red-300 text-red-700 hover:bg-red-100'
                : 'border-green-300 text-green-700 hover:bg-green-100'
              }
            `}
          >
            <Link href={`/polls/${poll.id}`}>View Results</Link>
          </Button>
          {!poll.isExpired && (
            <Button 
              variant="outline" 
              size="sm" 
              asChild
              className="border-green-300 text-green-700 hover:bg-green-100"
            >
              <Link href={`/polls/${poll.id}/edit`}>Edit</Link>
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <DashboardSharePoll 
            pollId={poll.id}
            pollQuestion={poll.question}
            isExpired={poll.isExpired}
          />
          <DeletePollButton 
            pollId={poll.id}
            isExpired={poll.isExpired}
          />
        </div>
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Header with user info and logout */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Your Polls</h1>
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
            <User className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-600 font-medium">{user.email}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
            <Link href="/polls/create">Create New Poll</Link>
          </Button>
          <LogoutButton />
        </div>
      </div>
      
      {createdPoll && (
        <div className="bg-green-50 text-green-800 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="font-medium">
              Poll created successfully! Share it with others to start collecting responses.
            </span>
          </div>
        </div>
      )}
      
      {hasPolls ? (
        <div className="space-y-8">
          {/* Ongoing Polls Section */}
          {ongoingPolls.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <h2 className="text-2xl font-semibold text-green-800">Ongoing Polls</h2>
                </div>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  {ongoingPolls.length} active
                </span>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {ongoingPolls.map((poll) => (
                  <PollCard key={poll.id} poll={poll} />
                ))}
              </div>
            </section>
          )}

          {/* Expired Polls Section */}
          {expiredPolls.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-6 w-6 text-red-600" />
                  <h2 className="text-2xl font-semibold text-red-800">Expired Polls</h2>
                </div>
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                  {expiredPolls.length} expired
                </span>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {expiredPolls.map((poll) => (
                  <PollCard key={poll.id} poll={poll} />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="text-center py-16 space-y-4">
          <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">No polls yet</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Create your first poll to start collecting responses from your audience.
          </p>
          <Button asChild className="mt-6 bg-green-600 hover:bg-green-700 text-white">
            <Link href="/polls/create">Create Your First Poll</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
