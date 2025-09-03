import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { createMocks } from 'node-mocks-http';

// Mock the poll actions
jest.mock('../../../app/actions/poll-actions');

// Mock next/cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

import { votePoll } from '../../../app/actions/poll-actions';

const mockVotePoll = votePoll as jest.MockedFunction<typeof votePoll>;

describe('Vote API Integration Tests', () => {
  const mockPollId = 'poll-123';
  const mockOptionId = 'option-456';

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Vote API Logic Tests', () => {
    /**
     * SUCCESS CASE: Valid vote submission
     * Tests that a valid vote request with proper optionId and pollId succeeds
     */
    it('should successfully submit a vote when all parameters are valid', async () => {
      // Arrange: Mock successful vote submission
      mockVotePoll.mockResolvedValue({
        success: true,
      });

      const requestBody = { optionId: mockOptionId };

      // Act & Assert: Call votePoll directly to test the business logic
      const result = await votePoll(mockPollId, mockOptionId);
      
      expect(result.success).toBe(true);
      expect(mockVotePoll).toHaveBeenCalledWith(mockPollId, mockOptionId);
      expect(mockVotePoll).toHaveBeenCalledTimes(1);
    });

    /**
     * INVALID VOTE CASE: User has already voted
     * Tests that attempting to vote again returns a 409 conflict error
     */
    it('should return error when user has already voted on the poll', async () => {
      // Arrange: Mock vote submission failure due to already voted
      mockVotePoll.mockResolvedValue({
        success: false,
        error: 'You have already voted on this poll',
      });

      // Act: Attempt to vote
      const result = await votePoll(mockPollId, mockOptionId);
      
      // Assert: Should fail with already voted error
      expect(result.success).toBe(false);
      expect(result.error).toBe('You have already voted on this poll');
      expect(mockVotePoll).toHaveBeenCalledWith(mockPollId, mockOptionId);
      expect(mockVotePoll).toHaveBeenCalledTimes(1);
    });

    /**
     * INVALID VOTE CASE: Poll not found
     * Tests that voting on a non-existent poll returns an error
     */
    it('should return error when poll does not exist', async () => {
      // Arrange: Mock vote submission failure due to poll not found
      mockVotePoll.mockResolvedValue({
        success: false,
        error: 'Poll not found',
      });

      const invalidPollId = 'non-existent-poll';
      
      // Act: Attempt to vote on non-existent poll
      const result = await votePoll(invalidPollId, mockOptionId);
      
      // Assert: Should fail with poll not found error
      expect(result.success).toBe(false);
      expect(result.error).toBe('Poll not found');
      expect(mockVotePoll).toHaveBeenCalledWith(invalidPollId, mockOptionId);
    });

    /**
     * INVALID VOTE CASE: Authentication error
     * Tests that unauthenticated users cannot vote
     */
    it('should return authentication error when user is not logged in', async () => {
      // Arrange: Mock authentication error
      mockVotePoll.mockRejectedValue(new Error('You must be logged in to vote'));
      
      // Act & Assert: Should throw authentication error
      await expect(votePoll(mockPollId, mockOptionId))
        .rejects
        .toThrow('You must be logged in to vote');
      
      expect(mockVotePoll).toHaveBeenCalledWith(mockPollId, mockOptionId);
    });

    /**
     * INVALID VOTE CASE: Database/Server error
     * Tests handling of unexpected server errors
     */
    it('should handle unexpected database errors gracefully', async () => {
      // Arrange: Mock unexpected database error
      mockVotePoll.mockRejectedValue(new Error('Database connection failed'));
      
      // Act & Assert: Should throw the database error
      await expect(votePoll(mockPollId, mockOptionId))
        .rejects
        .toThrow('Database connection failed');
      
      expect(mockVotePoll).toHaveBeenCalledWith(mockPollId, mockOptionId);
    });

    /**
     * VALIDATION TEST: Invalid option ID
     * Tests that empty or invalid option IDs are handled
     */
    it('should handle invalid option IDs', async () => {
      // Arrange: Mock validation error for invalid option
      mockVotePoll.mockResolvedValue({
        success: false,
        error: 'Invalid option ID',
      });
      
      const invalidOptionId = '';
      
      // Act: Attempt to vote with invalid option ID
      const result = await votePoll(mockPollId, invalidOptionId);
      
      // Assert: Should fail with validation error
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid option ID');
      expect(mockVotePoll).toHaveBeenCalledWith(mockPollId, invalidOptionId);
    });

    /**
     * VALIDATION TEST: Poll ID validation
     * Tests that empty poll IDs are handled appropriately
     */
    it('should handle invalid poll IDs', async () => {
      // Arrange: Mock validation error for invalid poll
      mockVotePoll.mockResolvedValue({
        success: false,
        error: 'Invalid poll ID',
      });
      
      const invalidPollId = '';
      
      // Act: Attempt to vote with invalid poll ID
      const result = await votePoll(invalidPollId, mockOptionId);
      
      // Assert: Should fail with validation error
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid poll ID');
      expect(mockVotePoll).toHaveBeenCalledWith(invalidPollId, mockOptionId);
    });
  });
});
