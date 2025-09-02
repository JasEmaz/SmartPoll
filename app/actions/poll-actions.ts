'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export interface PollOption {
  id?: string;
  text: string;
  votes?: number;
}

export interface PollData {
  question: string;
  options: PollOption[];
  expiresAt?: string | null;
}

/**
 * Creates a new poll with the provided data
 */
export async function createPoll(data: PollData) {
  const supabase = createClient();
  const { question, options, expiresAt } = data;
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('You must be logged in to create a poll');
  }
  
  // Start a transaction by using a single connection
  try {
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
    
    revalidatePath('/dashboard');
    return { success: true, pollId: poll.id };
  } catch (error) {
    console.error('Error creating poll:', error);
    return { success: false, error: 'Failed to create poll' };
  }
}

/**
 * Updates an existing poll
 */
export async function updatePoll(pollId: string, data: PollData) {
  const supabase = createClient();
  const { question, options } = data;
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('You must be logged in to update a poll');
  }
  
  // Verify ownership
  const { data: poll, error: pollCheckError } = await supabase
    .from('polls')
    .select('user_id')
    .eq('id', pollId)
    .single();
  
  if (pollCheckError) {
    return { success: false, error: 'Poll not found' };
  }
  
  if (poll.user_id !== user.id) {
    return { success: false, error: 'You do not have permission to update this poll' };
  }
  
  try {
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
    
    revalidatePath(`/polls/${pollId}`);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error updating poll:', error);
    return { success: false, error: 'Failed to update poll' };
  }
}

/**
 * Deletes a poll and all associated data
 */
export async function deletePoll(pollId: string) {
  const supabase = createClient();
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('You must be logged in to delete a poll');
  }
  
  // Verify ownership
  const { data: poll, error: pollCheckError } = await supabase
    .from('polls')
    .select('user_id')
    .eq('id', pollId)
    .single();
  
  if (pollCheckError) {
    return { success: false, error: 'Poll not found' };
  }
  
  if (poll.user_id !== user.id) {
    return { success: false, error: 'You do not have permission to delete this poll' };
  }
  
  try {
    // Delete the poll (cascade will handle options and votes)
    const { error } = await supabase
      .from('polls')
      .delete()
      .eq('id', pollId);
    
    if (error) throw error;
    
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error deleting poll:', error);
    return { success: false, error: 'Failed to delete poll' };
  }
}

/**
 * Submits a vote for a poll option
 */
export async function votePoll(pollId: string, optionId: string) {
  const supabase = createClient();
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('You must be logged in to vote');
  }
  
  try {
    // Use the increment_vote function to prevent double voting and update vote count atomically
    const { error } = await supabase.rpc('increment_vote', {
      option_id: optionId,
      poll_id: pollId,
      user_id: user.id
    });

    if (error) {
      if (error.message.includes('already voted')) {
        return { success: false, error: 'You have already voted on this poll' };
      }
      throw error;
    }
    
    revalidatePath(`/polls/${pollId}`);
    return { success: true };
  } catch (error) {
    console.error('Error submitting vote:', error);
    return { success: false, error: 'Failed to submit vote' };
  }
}

/**
 * Gets a poll by ID with all its options and vote counts
 */
export async function getPoll(pollId: string) {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from('polls')
      .select('id, question, created_at, user_id, expires_at, poll_options(*)')
      .eq('id', pollId)
      .single();
    
    if (error) throw error;
    
    // Format the poll data
    const formattedPoll = {
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
    
    return { success: true, poll: formattedPoll };
  } catch (error) {
    console.error('Error fetching poll:', error);
    return { success: false, error: 'Failed to load poll' };
  }
}

/**
 * Gets all polls created by the current user with categorization
 */
export async function getUserPolls() {
  const supabase = createClient();
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('You must be logged in to view your polls');
  }
  
  try {
    const { data, error } = await supabase
      .from('polls')
      .select('id, question, created_at, expires_at, user_id, poll_options(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;

    const currentTime = new Date();
    const pollsWithVotes = data.map((poll: any) => {
      const totalVotes = poll.poll_options.reduce((acc: number, option: any) => 
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

    return { 
      success: true, 
      polls: pollsWithVotes,
      ongoingPolls,
      expiredPolls
    };
  } catch (error) {
    console.error('Error fetching polls:', error);
    return { success: false, error: 'Failed to load polls' };
  }
}

/**
 * Checks if a user has already voted on a poll
 */
export async function checkVoteStatus(pollId: string) {
  const supabase = createClient();
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { hasVoted: false };
  }
  
  try {
    const { data, error } = await supabase
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
    
    return { hasVoted: true, optionId: data.option_id };
  } catch (error) {
    console.error('Error checking vote status:', error);
    return { hasVoted: false, error: 'Failed to check vote status' };
  }
}