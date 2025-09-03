'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Export types from our centralized types module
export type {
  PollOption,
  PollData,
  Poll,
  UserPoll,
  ApiResponse,
  VoteStatus
} from './poll-types';

// Import functionality from modular components
import {
  createPollOperation,
  updatePollOperation,
  deletePollOperation,
  votePollOperation,
  getPollOperation,
  getUserPollsOperation,
  checkVoteStatusOperation
} from './poll-operations';

// Re-export error handling utilities for convenience
export { createSuccessResponse, createErrorResponse } from './poll-errors';

/**
 * Create a new poll
 * @param data - The poll data to create
 */
export async function createPoll(data: PollData) {
  const result = await createPollOperation(data);
  
  if (result.success) {
    revalidatePath('/dashboard');
  }
  
  return result;
}

/**
 * Update an existing poll
 * @param pollId - The ID of the poll to update
 * @param data - The updated poll data
 */
export async function updatePoll(pollId: string, data: PollData) {
  const result = await updatePollOperation(pollId, data);
  
  if (result.success) {
    revalidatePath(`/polls/${pollId}`);
    revalidatePath('/dashboard');
  }
  
  return result;
}

/**
 * Delete a poll
 * @param pollId - The ID of the poll to delete
 */
export async function deletePoll(pollId: string) {
  const result = await deletePollOperation(pollId);
  
  if (result.success) {
    revalidatePath('/dashboard');
  }
  
  return result;
}

/**
 * Vote on a poll
 * @param pollId - The ID of the poll to vote on
 * @param optionId - The ID of the option to vote for
 */
export async function votePoll(pollId: string, optionId: string) {
  const result = await votePollOperation(pollId, optionId);
  
  if (result.success) {
    revalidatePath(`/polls/${pollId}`);
  }
  
  return result;
}

/**
 * Get a specific poll by ID
 * @param pollId - The ID of the poll to retrieve
 */
export async function getPoll(pollId: string) {
  return getPollOperation(pollId);
}

/**
 * Get all polls for the current user
 */
export async function getUserPolls() {
  return getUserPollsOperation();
}

/**
 * Check if the current user has voted on a poll
 * @param pollId - The ID of the poll to check
 */
export async function checkVoteStatus(pollId: string) {
  return checkVoteStatusOperation(pollId);
}
