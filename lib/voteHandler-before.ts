import { createClient } from '@/lib/supabase/server';

interface VoteRequest {
  pollId: string;
  optionId: string;
  userId?: string;
}

interface VoteResponse {
  success: boolean;
  error?: string;
  data?: {
    pollId: string;
    optionId: string;
    userId: string;
    newVoteCount?: number;
  };
}

export async function handleVote(voteData: VoteRequest): Promise<VoteResponse> {
  try {
    const supabaseClient = createClient();
    const pollIdentifier = voteData.pollId;
    const optionIdentifier = voteData.optionId;
    let userIdentifier = voteData.userId;

    // Validate required fields
    if (!pollIdentifier || !optionIdentifier) {
      return {
        success: false,
        error: 'Poll ID and Option ID are required'
      };
    }

    // Get user ID if not provided
    if (!userIdentifier) {
      const authResult = await supabaseClient.auth.getUser();
      
      if (authResult.error || !authResult.data.user) {
        return {
          success: false,
          error: 'Authentication required'
        };
      }
      
      userIdentifier = authResult.data.user.id;
    }

    // Check if poll exists
    const pollCheckResult = await supabaseClient
      .from('polls')
      .select('id, question, expires_at')
      .eq('id', pollIdentifier)
      .single();

    if (pollCheckResult.error || !pollCheckResult.data) {
      return {
        success: false,
        error: 'Poll not found'
      };
    }

    const pollData = pollCheckResult.data;

    // Check if poll has expired
    if (pollData.expires_at && new Date(pollData.expires_at) < new Date()) {
      return {
        success: false,
        error: 'Poll has expired'
      };
    }

    // Check if option exists for this poll
    const optionCheckResult = await supabaseClient
      .from('poll_options')
      .select('id, poll_id')
      .eq('id', optionIdentifier)
      .eq('poll_id', pollIdentifier)
      .single();

    if (optionCheckResult.error || !optionCheckResult.data) {
      return {
        success: false,
        error: 'Invalid option for this poll'
      };
    }

    // Check if user has already voted on this poll
    const existingVoteCheckResult = await supabaseClient
      .from('votes')
      .select('id')
      .eq('user_id', userIdentifier)
      .eq('poll_id', pollIdentifier)
      .single();

    if (existingVoteCheckResult.error && existingVoteCheckResult.error.code !== 'PGRST116') {
      throw existingVoteCheckResult.error;
    }

    if (existingVoteCheckResult.data) {
      return {
        success: false,
        error: 'You have already voted on this poll'
      };
    }

    // Record the vote using RPC function
    const voteRecordResult = await supabaseClient.rpc('increment_vote', {
      option_id: optionIdentifier,
      poll_id: pollIdentifier,
      user_id: userIdentifier
    });

    if (voteRecordResult.error) {
      if (voteRecordResult.error.message.includes('already voted')) {
        return {
          success: false,
          error: 'You have already voted on this poll'
        };
      }
      throw voteRecordResult.error;
    }

    // Get updated vote count
    const updatedVoteCountResult = await supabaseClient
      .from('poll_options')
      .select('votes')
      .eq('id', optionIdentifier)
      .single();

    let updatedVoteCount: number | undefined;
    if (updatedVoteCountResult.data) {
      updatedVoteCount = updatedVoteCountResult.data.votes;
    }

    return {
      success: true,
      data: {
        pollId: pollIdentifier,
        optionId: optionIdentifier,
        userId: userIdentifier,
        newVoteCount: updatedVoteCount
      }
    };

  } catch (error) {
    console.error('Error in handleVote:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
}
