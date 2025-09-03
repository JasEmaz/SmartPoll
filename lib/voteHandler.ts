import { getSupabaseClient } from '@/app/actions/poll-client';
import { getCurrentUserSafe } from '@/app/actions/poll-auth';
import { createErrorResponse, createSuccessResponse, handleError } from '@/app/actions/poll-errors';
import type { ApiResponse } from '@/app/actions/poll-types';

/**
 * Vote request interface with strict typing
 */
export interface VoteRequest {
  pollId: string;
  optionId: string;
  userId?: string; // Optional for testing
}

/**
 * Vote response data interface
 */
export interface VoteData {
  pollId: string;
  optionId: string;
  userId: string;
  newVoteCount: number;
}

/**
 * Combined poll and option validation result
 */
interface PollValidation {
  isValid: boolean;
  pollId: string;
  optionId: string;
  error?: string;
  isExpired?: boolean;
}

/**
 * Optimized vote handler with improved performance and clarity
 * 
 * Key optimizations:
 * - Single query for poll + option validation
 * - Early returns to avoid unnecessary checks
 * - Memoized client instance
 * - Reduced variable verbosity
 * - Type-safe interfaces
 */
export async function handleVote({ pollId, optionId, userId }: VoteRequest): Promise<ApiResponse<VoteData>> {
  // Input validation - fail fast
  if (!pollId?.trim() || !optionId?.trim()) {
    return createErrorResponse('Poll ID and Option ID are required');
  }

  const client = getSupabaseClient();
  
  try {
    // Step 1: Get authenticated user
    const user = userId || await getAuthenticatedUserId(client);
    if (!user) {
      return createErrorResponse('Authentication required');
    }

    // Step 2: Validate poll and option in single query (OPTIMIZATION)
    const validation = await validatePollAndOption(client, pollId, optionId);
    if (!validation.isValid) {
      return createErrorResponse(validation.error!);
    }

    // Step 3: Check existing vote and record new vote atomically
    const voteResult = await recordVoteAtomically(client, pollId, optionId, user);
    if (!voteResult.success) {
      return createErrorResponse(voteResult.error!);
    }

    // Step 4: Return success with vote count from atomic operation
    return createSuccessResponse<VoteData>({
      pollId,
      optionId,
      userId: user,
      newVoteCount: voteResult.newVoteCount!
    });

  } catch (err) {
    return handleError(err, 'Failed to process vote', 'VOTE_HANDLER');
  }
}

/**
 * Get authenticated user ID with performance optimization
 */
async function getAuthenticatedUserId(client: any): Promise<string | null> {
  const authResult = await getCurrentUserSafe();
  return authResult.success ? authResult.user!.id : null;
}

/**
 * Validate poll existence and option in a single optimized query
 * Reduces database calls from 2 to 1
 */
async function validatePollAndOption(
  client: any, 
  pollId: string, 
  optionId: string
): Promise<PollValidation> {
  // OPTIMIZATION: Single query with JOIN to check both poll and option
  const { data, error } = await client
    .from('polls')
    .select(`
      id,
      expires_at,
      poll_options!inner(
        id,
        poll_id
      )
    `)
    .eq('id', pollId)
    .eq('poll_options.id', optionId)
    .single();

  if (error || !data) {
    return {
      isValid: false,
      pollId,
      optionId,
      error: error?.code === 'PGRST116' ? 'Poll or option not found' : 'Invalid poll or option'
    };
  }

  // Check expiration
  const now = Date.now();
  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : null;
  
  if (expiresAt && expiresAt <= now) {
    return {
      isValid: false,
      pollId,
      optionId,
      error: 'Poll has expired',
      isExpired: true
    };
  }

  return {
    isValid: true,
    pollId,
    optionId
  };
}

/**
 * Record vote atomically using RPC function
 * The RPC handles duplicate checking and vote counting in a single transaction
 */
async function recordVoteAtomically(
  client: any,
  pollId: string,
  optionId: string,
  userId: string
): Promise<{ success: boolean; error?: string; newVoteCount?: number }> {
  // Use RPC function for atomic vote operation
  const { data, error } = await client.rpc('increment_vote', {
    option_id: optionId,
    poll_id: pollId,
    user_id: userId
  });

  if (error) {
    // Handle specific error cases
    if (error.message.includes('already voted')) {
      return { success: false, error: 'You have already voted on this poll' };
    }
    throw error;
  }

  // OPTIMIZATION: RPC function should return the new vote count
  // If not available, we could modify the RPC or accept this trade-off
  // For now, we'll make a quick query for the count
  const { data: optionData } = await client
    .from('poll_options')
    .select('votes')
    .eq('id', optionId)
    .single();

  return {
    success: true,
    newVoteCount: optionData?.votes || 0
  };
}

/**
 * Memory-efficient vote count cache for high-frequency polls
 * (Optional - for very high-traffic scenarios)
 */
const voteCountCache = new Map<string, { count: number; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

/**
 * Get cached vote count or fetch from database
 * @param client - Supabase client
 * @param optionId - Option ID
 * @returns Promise<number> - Vote count
 */
async function getCachedVoteCount(client: any, optionId: string): Promise<number> {
  const cached = voteCountCache.get(optionId);
  const now = Date.now();
  
  // Return cached value if still fresh
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.count;
  }
  
  // Fetch fresh count
  const { data } = await client
    .from('poll_options')
    .select('votes')
    .eq('id', optionId)
    .single();
  
  const count = data?.votes || 0;
  
  // Update cache
  voteCountCache.set(optionId, { count, timestamp: now });
  
  return count;
}

/**
 * Clear vote count cache (useful for testing or manual cache invalidation)
 */
export function clearVoteCountCache(): void {
  voteCountCache.clear();
}

/**
 * Enhanced vote handler with caching for high-traffic scenarios
 */
export async function handleVoteWithCache({ pollId, optionId, userId }: VoteRequest): Promise<ApiResponse<VoteData>> {
  // Same validation logic as main handler
  if (!pollId?.trim() || !optionId?.trim()) {
    return createErrorResponse('Poll ID and Option ID are required');
  }

  const client = getSupabaseClient();
  
  try {
    const user = userId || await getAuthenticatedUserId(client);
    if (!user) {
      return createErrorResponse('Authentication required');
    }

    const validation = await validatePollAndOption(client, pollId, optionId);
    if (!validation.isValid) {
      return createErrorResponse(validation.error!);
    }

    const voteResult = await recordVoteAtomically(client, pollId, optionId, user);
    if (!voteResult.success) {
      return createErrorResponse(voteResult.error!);
    }

    // Use cached vote count for better performance
    const newVoteCount = await getCachedVoteCount(client, optionId);
    
    return createSuccessResponse<VoteData>({
      pollId,
      optionId,
      userId: user,
      newVoteCount
    });

  } catch (err) {
    return handleError(err, 'Failed to process vote', 'VOTE_HANDLER_CACHED');
  }
}
