import { getSupabaseClient } from './poll-client';
import { getCurrentUser, verifyPollOwnership } from './poll-auth';
import { validatePollDataSimple, validatePollId, validateOptionId } from './poll-validation';
import { 
  handleError, 
  createSuccessResponse, 
  handlePermissionError, 
  handleNotFoundError,
  handleValidationError
} from './poll-errors';
import type { 
  PollData, 
  Poll, 
  UserPoll, 
  ApiResponse, 
  VoteStatus, 
  DatabasePoll,
  PollCreationResult 
} from './poll-types';

/**
 * Create a new poll
 * @param data - The poll data to create
 * @returns Promise<ApiResponse<PollCreationResult>> - The creation result
 */
export async function createPollOperation(data: PollData): Promise<ApiResponse<PollCreationResult>> {
  try {
    // Validate input
    const validationError = validatePollDataSimple(data);
    if (validationError) {
      return handleValidationError(validationError);
    }
    
    const user = await getCurrentUser();
    const supabase = getSupabaseClient();
    const { question, options, expiresAt } = data;
    
    // 1. Create the poll
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .insert({
        question,
        user_id: user.id,
        expires_at: expiresAt || null
      })
      .select()
      .single();
    
    if (pollError) throw pollError;
    
    // 2. Create the options
    const optionsToInsert = options.map(option => ({
      poll_id: poll.id,
      option_text: option.text,
      votes: 0
    }));
    
    const { error: optionsError } = await supabase
      .from('poll_options')
      .insert(optionsToInsert);
    
    if (optionsError) throw optionsError;
    
    return createSuccessResponse({ pollId: poll.id });
  } catch (error) {
    return handleError(error, 'Failed to create poll', 'CREATE_POLL');
  }
}

/**
 * Update an existing poll
 * @param pollId - The ID of the poll to update
 * @param data - The updated poll data
 * @returns Promise<ApiResponse> - The update result
 */
export async function updatePollOperation(pollId: string, data: PollData): Promise<ApiResponse> {
  try {
    // Validate poll ID
    const pollIdErrors = validatePollId(pollId);
    if (pollIdErrors.length > 0) {
      return handleValidationError(pollIdErrors[0].message);
    }
    
    // Validate input data
    const validationError = validatePollDataSimple(data);
    if (validationError) {
      return handleValidationError(validationError);
    }
    
    const user = await getCurrentUser();
    const supabase = getSupabaseClient();
    const { question, options } = data;
    
    // Verify ownership
    const isOwner = await verifyPollOwnership(pollId);
    if (!isOwner) {
      return handlePermissionError('poll', 'update');
    }
    
    // 1. Update the poll question
    const { error: updateError } = await supabase
      .from('polls')
      .update({ question })
      .eq('id', pollId);
    
    if (updateError) throw updateError;
    
    // 2. Handle options
    // Get existing options
    const { data: existingOptions, error: optionsError } = await supabase
      .from('poll_options')
      .select('id, option_text')
      .eq('poll_id', pollId);
    
    if (optionsError) throw optionsError;
    
    // Separate options into existing (to update) and new (to insert)
    const existingOptionIds = existingOptions.map(o => o.id);
    const optionsToUpdate = options.filter(o => o.id && existingOptionIds.includes(o.id));
    const optionsToInsert = options.filter(o => !o.id || !existingOptionIds.includes(o.id));
    
    // Update existing options
    for (const option of optionsToUpdate) {
      const { error } = await supabase
        .from('poll_options')
        .update({ option_text: option.text })
        .eq('id', option.id);
      
      if (error) throw error;
    }
    
    // Insert new options
    if (optionsToInsert.length > 0) {
      const newOptions = optionsToInsert.map(option => ({
        poll_id: pollId,
        option_text: option.text,
        votes: 0
      }));
      
      const { error: insertError } = await supabase
        .from('poll_options')
        .insert(newOptions);
      
      if (insertError) throw insertError;
    }
    
    return createSuccessResponse();
  } catch (error) {
    return handleError(error, 'Failed to update poll', 'UPDATE_POLL');
  }
}

/**
 * Delete a poll
 * @param pollId - The ID of the poll to delete
 * @returns Promise<ApiResponse> - The deletion result
 */
export async function deletePollOperation(pollId: string): Promise<ApiResponse> {
  try {
    // Validate poll ID
    const pollIdErrors = validatePollId(pollId);
    if (pollIdErrors.length > 0) {
      return handleValidationError(pollIdErrors[0].message);
    }
    
    const user = await getCurrentUser();
    const supabase = getSupabaseClient();
    
    // Verify ownership
    const isOwner = await verifyPollOwnership(pollId);
    if (!isOwner) {
      return handlePermissionError('poll', 'delete');
    }
    
    // Delete the poll (cascade will handle options and votes)
    const { error } = await supabase
      .from('polls')
      .delete()
      .eq('id', pollId);
    
    if (error) throw error;
    
    return createSuccessResponse();
  } catch (error) {
    return handleError(error, 'Failed to delete poll', 'DELETE_POLL');
  }
}

/**
 * Vote on a poll
 * @param pollId - The ID of the poll to vote on
 * @param optionId - The ID of the option to vote for
 * @returns Promise<ApiResponse> - The voting result
 */
export async function votePollOperation(pollId: string, optionId: string): Promise<ApiResponse> {
  try {
    // Validate IDs
    const pollIdErrors = validatePollId(pollId);
    if (pollIdErrors.length > 0) {
      return handleValidationError(pollIdErrors[0].message);
    }
    
    const optionIdErrors = validateOptionId(optionId);
    if (optionIdErrors.length > 0) {
      return handleValidationError(optionIdErrors[0].message);
    }
    
    const user = await getCurrentUser();
    const supabase = getSupabaseClient();
    
    // Use the increment_vote function to prevent double voting and update vote count atomically
    const { error } = await supabase.rpc('increment_vote', {
      option_id: optionId,
      poll_id: pollId,
      user_id: user.id
    });

    if (error) {
      if (error.message.includes('already voted')) {
        return handleValidationError('You have already voted on this poll');
      }
      throw error;
    }
    
    return createSuccessResponse();
  } catch (error) {
    return handleError(error, 'Failed to submit vote', 'VOTE_POLL');
  }
}

/**
 * Get a specific poll by ID
 * @param pollId - The ID of the poll to retrieve
 * @returns Promise<ApiResponse<Poll>> - The poll data
 */
export async function getPollOperation(pollId: string): Promise<ApiResponse<Poll>> {
  try {
    // Validate poll ID
    const pollIdErrors = validatePollId(pollId);
    if (pollIdErrors.length > 0) {
      return handleValidationError(pollIdErrors[0].message);
    }
    
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('polls')
      .select('id, question, created_at, user_id, expires_at, poll_options(*)')
      .eq('id', pollId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return handleNotFoundError('Poll');
      }
      throw error;
    }
    
    // Format the poll data
    const formattedPoll: Poll = {
      id: data.id,
      question: data.question,
      options: data.poll_options.map((option: any) => ({
        id: option.id,
        text: option.option_text,
        votes: option.votes || 0
      })),
      totalVotes: data.poll_options.reduce((acc: number, option: any) => 
        acc + (option.votes || 0), 0),
      user_id: data.user_id,
      created_at: data.created_at,
      expires_at: data.expires_at
    };
    
    return createSuccessResponse(formattedPoll);
  } catch (error) {
    return handleError(error, 'Failed to load poll', 'GET_POLL');
  }
}

/**
 * Get all polls for the current user
 * @returns Promise<ApiResponse<{polls: UserPoll[], ongoingPolls: UserPoll[], expiredPolls: UserPoll[]}>> - User's polls
 */
export async function getUserPollsOperation(): Promise<ApiResponse<{ 
  polls: UserPoll[], 
  ongoingPolls: UserPoll[], 
  expiredPolls: UserPoll[] 
}>> {
  try {
    const user = await getCurrentUser();
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('polls')
      .select('id, question, created_at, expires_at, user_id, poll_options(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;

    const currentTime = new Date();
    const pollsWithVotes: UserPoll[] = data.map((poll: DatabasePoll) => {
      const totalVotes = poll.poll_options.reduce((acc: number, option) => 
        acc + (option.votes || 0), 0);
      
      const isExpired = poll.expires_at ? new Date(poll.expires_at) <= currentTime : false;
      
      return {
        id: poll.id,
        question: poll.question,
        created_at: poll.created_at,
        expires_at: poll.expires_at,
        user_id: poll.user_id,
        totalVotes,
        isExpired,
        status: isExpired ? 'expired' : 'ongoing'
      };
    });

    // Categorize polls
    const ongoingPolls = pollsWithVotes.filter(poll => !poll.isExpired);
    const expiredPolls = pollsWithVotes.filter(poll => poll.isExpired);

    return createSuccessResponse({
      polls: pollsWithVotes,
      ongoingPolls,
      expiredPolls
    });
  } catch (error) {
    return handleError(error, 'Failed to load polls', 'GET_USER_POLLS');
  }
}

/**
 * Check if the current user has voted on a poll
 * @param pollId - The ID of the poll to check
 * @returns Promise<VoteStatus> - The vote status information
 */
export async function checkVoteStatusOperation(pollId: string): Promise<VoteStatus> {
  try {
    const supabase = getSupabaseClient();
    
    // Try to get the current user, but don't throw if not authenticated
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    
    if (!user) {
      return { hasVoted: false };
    }
    
    const { data: voteData, error } = await supabase
      .from('votes')
      .select('option_id')
      .eq('user_id', user.id)
      .eq('poll_id', pollId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return { hasVoted: false, optionId: null };
      }
      throw error;
    }
    
    return { hasVoted: true, optionId: voteData.option_id };
  } catch (error) {
    return { hasVoted: false, error: 'Failed to check vote status' };
  }
}
