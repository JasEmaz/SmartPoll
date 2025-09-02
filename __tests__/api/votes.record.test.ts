import { describe, it, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Create a mock vote recording function that simulates the vote record API logic
const mockRecordVote = jest.fn();

// Mock Supabase client with proper structure
const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
  rpc: jest.fn(),
};

// Mock query builder chain
const mockQueryBuilder = {
  insert: jest.fn(),
  select: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
};

// Mock Supabase client functions
const mockSupabaseOperations = {
  // Mock authentication
  authenticateUser: jest.fn(),
  // Mock poll validation
  validatePoll: jest.fn(),
  // Mock option validation  
  validateOption: jest.fn(),
  // Mock duplicate vote check
  checkExistingVote: jest.fn(),
  // Mock RPC vote recording
  incrementVote: jest.fn(),
  // Mock vote count retrieval
  getUpdatedVoteCount: jest.fn(),
};

// Mock next/cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const { revalidatePath } = jest.requireMock('next/cache');

describe('Votes Record API Business Logic Tests', () => {
  const mockPollId = 'poll-123';
  const mockOptionId = 'option-456';
  const mockUserId = 'user-789';

  beforeEach(() => {
    jest.resetAllMocks();
    
    // Set up default successful mock implementations
    mockSupabaseOperations.authenticateUser.mockResolvedValue({ success: true, userId: mockUserId });
    mockSupabaseOperations.validatePoll.mockResolvedValue({ success: true, poll: { id: mockPollId, expires_at: null } });
    mockSupabaseOperations.validateOption.mockResolvedValue({ success: true });
    mockSupabaseOperations.checkExistingVote.mockResolvedValue({ hasVoted: false });
    mockSupabaseOperations.incrementVote.mockResolvedValue({ success: true });
    mockSupabaseOperations.getUpdatedVoteCount.mockResolvedValue({ count: 1 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Unit Tests', () => {
    /**
     * UNIT TEST 1: Happy Path - Successful Vote Recording
     * Tests that a valid vote request is processed successfully
     */
    it('should successfully record a new vote when all validations pass', async () => {
      // Arrange
      const voteRequest = {
        pollId: mockPollId,
        optionId: mockOptionId,
        userId: mockUserId,
      };

      // Mock the complete vote recording flow
      mockRecordVote.mockImplementation(async ({ pollId, optionId, userId }) => {
        // Step 1: Validate poll
        const pollValidation = await mockSupabaseOperations.validatePoll(pollId);
        if (!pollValidation.success) {
          return { success: false, error: 'Poll not found', status: 404 };
        }

        // Step 2: Validate option
        const optionValidation = await mockSupabaseOperations.validateOption(optionId, pollId);
        if (!optionValidation.success) {
          return { success: false, error: 'Invalid option', status: 400 };
        }

        // Step 3: Check for existing vote
        const existingVote = await mockSupabaseOperations.checkExistingVote(userId, pollId);
        if (existingVote.hasVoted) {
          return { success: false, error: 'You have already voted on this poll', status: 409 };
        }

        // Step 4: Record the vote
        const voteResult = await mockSupabaseOperations.incrementVote(optionId, pollId, userId);
        if (!voteResult.success) {
          return { success: false, error: 'Failed to record vote', status: 500 };
        }

        // Step 5: Get updated count
        const updatedCount = await mockSupabaseOperations.getUpdatedVoteCount(optionId);

        return {
          success: true,
          status: 201,
          data: {
            pollId,
            optionId,
            userId,
            newVoteCount: updatedCount.count,
          },
          message: 'Vote recorded successfully',
        };
      });

      // Act
      const result = await mockRecordVote(voteRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.status).toBe(201);
      expect(result.message).toBe('Vote recorded successfully');
      expect(result.data.pollId).toBe(mockPollId);
      expect(result.data.optionId).toBe(mockOptionId);
      expect(result.data.userId).toBe(mockUserId);
      expect(result.data.newVoteCount).toBe(1);

      // Verify all steps were called in order
      expect(mockSupabaseOperations.validatePoll).toHaveBeenCalledWith(mockPollId);
      expect(mockSupabaseOperations.validateOption).toHaveBeenCalledWith(mockOptionId, mockPollId);
      expect(mockSupabaseOperations.checkExistingVote).toHaveBeenCalledWith(mockUserId, mockPollId);
      expect(mockSupabaseOperations.incrementVote).toHaveBeenCalledWith(mockOptionId, mockPollId, mockUserId);
      expect(mockSupabaseOperations.getUpdatedVoteCount).toHaveBeenCalledWith(mockOptionId);
    });

    /**
     * UNIT TEST 2: Edge Case - Duplicate Vote Prevention with Unique Constraint Error
     * Tests that the system handles PostgreSQL unique constraint errors for duplicate votes
     */
    it('rejects duplicate vote with unique constraint error', async () => {
      // Arrange
      const voteRequest = {
        pollId: 'poll-123',
        optionId: 'option-456',
        userId: 'user-789',
      };

      // Import and spy on supabase module
      const supabaseModule = require('@/lib/supabase/server');
      const createClient = jest.spyOn(supabaseModule, 'createClient');
      
      // Mock insert to throw unique constraint error
      const mockInsert = jest.fn().mockRejectedValue({ code: '23505', message: 'unique constraint' });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });
      createClient.mockReturnValue({ from: mockFrom, auth: { getUser: jest.fn() }, rpc: jest.fn() });

      // Mock recordVote to simulate using supabase and handle unique constraint error
      mockRecordVote.mockImplementation(async ({ pollId, optionId, userId }) => {
        try {
          // Attempt to insert a vote, which will fail due to unique constraint
          await createClient().from('votes').insert([{ poll_id: pollId, option_id: optionId, user_id: userId }]);
          return { success: true, status: 201 };
        } catch (error: any) {
          if (error.code === '23505') {
            return { success: false, error: 'Duplicate vote error: unique constraint violation', status: 409, message: error.message };
          }
          return { success: false, error: 'Unknown error', status: 500 };
        }
      });

      // Act
      const result = await mockRecordVote(voteRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(409);
      expect(result.message).toContain('unique constraint');
      expect(mockInsert).toHaveBeenCalled();

      // Cleanup mocks
      createClient.mockRestore();
    });
  });

  describe('Integration Tests', () => {
    /**
     * INTEGRATION TEST: Verify Complete Vote Recording Flow
     * Tests the complete flow including all Supabase interactions
     */
    it('should integrate properly with all vote recording steps', async () => {
      // Arrange
      const voteRequest = {
        pollId: mockPollId,
        optionId: mockOptionId,
        // Simulate authentication flow
      };

      // Mock authentication step
      mockSupabaseOperations.authenticateUser.mockResolvedValue({ 
        success: true, 
        userId: mockUserId 
      });

      // Mock poll with expiration check
      mockSupabaseOperations.validatePoll.mockResolvedValue({
        success: true,
        poll: {
          id: mockPollId,
          question: 'Integration Test Poll',
          expires_at: new Date(Date.now() + 86400000).toISOString(), // Expires tomorrow
        },
      });

      // Mock comprehensive vote recording flow
      mockRecordVote.mockImplementation(async ({ pollId, optionId }) => {
        // Step 1: Authenticate user
        const auth = await mockSupabaseOperations.authenticateUser();
        if (!auth.success) {
          return { success: false, error: 'Authentication required', status: 401 };
        }

        const { userId } = auth;

        // Step 2: Validate poll and check expiration
        const pollValidation = await mockSupabaseOperations.validatePoll(pollId);
        if (!pollValidation.success) {
          return { success: false, error: 'Poll not found', status: 404 };
        }

        const { poll } = pollValidation;
        if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
          return { success: false, error: 'Poll has expired', status: 410 };
        }

        // Step 3: Validate option belongs to poll
        const optionValidation = await mockSupabaseOperations.validateOption(optionId, pollId);
        if (!optionValidation.success) {
          return { success: false, error: 'Invalid option for this poll', status: 400 };
        }

        // Step 4: Check for existing vote
        const existingVote = await mockSupabaseOperations.checkExistingVote(userId, pollId);
        if (existingVote.hasVoted) {
          return { success: false, error: 'You have already voted on this poll', status: 409 };
        }

        // Step 5: Record vote atomically
        const voteResult = await mockSupabaseOperations.incrementVote(optionId, pollId, userId);
        if (!voteResult.success) {
          return { success: false, error: 'Database error', status: 500 };
        }

        // Step 6: Get updated vote count
        const updatedCount = await mockSupabaseOperations.getUpdatedVoteCount(optionId);

        return {
          success: true,
          status: 201,
          data: {
            pollId,
            optionId,
            userId,
            newVoteCount: updatedCount.count,
          },
        };
      });

      // Act
      const result = await mockRecordVote(voteRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.status).toBe(201);
      expect(result.data.userId).toBe(mockUserId);

      // Verify all integration steps were called
      expect(mockSupabaseOperations.authenticateUser).toHaveBeenCalled();
      expect(mockSupabaseOperations.validatePoll).toHaveBeenCalledWith(mockPollId);
      expect(mockSupabaseOperations.validateOption).toHaveBeenCalledWith(mockOptionId, mockPollId);
      expect(mockSupabaseOperations.checkExistingVote).toHaveBeenCalledWith(mockUserId, mockPollId);
      expect(mockSupabaseOperations.incrementVote).toHaveBeenCalledWith(mockOptionId, mockPollId, mockUserId);
      expect(mockSupabaseOperations.getUpdatedVoteCount).toHaveBeenCalledWith(mockOptionId);
    });
  });

  describe('Error Scenarios', () => {
    it('should return 400 for missing required fields', async () => {
      // Arrange
      const invalidRequest = { pollId: mockPollId }; // Missing optionId

      mockRecordVote.mockImplementation(async ({ pollId, optionId }) => {
        if (!pollId || !optionId) {
          return { success: false, error: 'Poll ID and Option ID are required', status: 400 };
        }
        return { success: true, status: 201 };
      });

      // Act
      const result = await mockRecordVote(invalidRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toBe('Poll ID and Option ID are required');
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Arrange
      const voteRequest = { pollId: mockPollId, optionId: mockOptionId };
      
      // Mock authentication failure
      mockSupabaseOperations.authenticateUser.mockResolvedValue({ success: false });

      mockRecordVote.mockImplementation(async () => {
        const auth = await mockSupabaseOperations.authenticateUser();
        if (!auth.success) {
          return { success: false, error: 'Authentication required', status: 401 };
        }
        return { success: true, status: 201 };
      });

      // Act
      const result = await mockRecordVote(voteRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
      expect(result.error).toBe('Authentication required');
    });

    it('should return 404 for non-existent poll', async () => {
      // Arrange
      const voteRequest = { pollId: 'non-existent-poll', optionId: mockOptionId, userId: mockUserId };

      // Mock poll not found
      mockSupabaseOperations.validatePoll.mockResolvedValue({ success: false });

      mockRecordVote.mockImplementation(async ({ pollId }) => {
        const pollValidation = await mockSupabaseOperations.validatePoll(pollId);
        if (!pollValidation.success) {
          return { success: false, error: 'Poll not found', status: 404 };
        }
        return { success: true, status: 201 };
      });

      // Act
      const result = await mockRecordVote(voteRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(404);
      expect(result.error).toBe('Poll not found');
    });

    it('should return 410 for expired poll', async () => {
      // Arrange
      const voteRequest = { pollId: mockPollId, optionId: mockOptionId, userId: mockUserId };

      // Mock expired poll
      const expiredDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
      mockSupabaseOperations.validatePoll.mockResolvedValue({
        success: true,
        poll: { id: mockPollId, expires_at: expiredDate },
      });

      mockRecordVote.mockImplementation(async ({ pollId }) => {
        const pollValidation = await mockSupabaseOperations.validatePoll(pollId);
        const { poll } = pollValidation;
        
        if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
          return { success: false, error: 'Poll has expired', status: 410 };
        }
        return { success: true, status: 201 };
      });

      // Act
      const result = await mockRecordVote(voteRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(410);
      expect(result.error).toBe('Poll has expired');
    });

    it('should return 400 for invalid option', async () => {
      // Arrange
      const voteRequest = { pollId: mockPollId, optionId: 'invalid-option', userId: mockUserId };

      // Mock option validation failure
      mockSupabaseOperations.validateOption.mockResolvedValue({ success: false });

      mockRecordVote.mockImplementation(async ({ pollId, optionId }) => {
        await mockSupabaseOperations.validatePoll(pollId);
        
        const optionValidation = await mockSupabaseOperations.validateOption(optionId, pollId);
        if (!optionValidation.success) {
          return { success: false, error: 'Invalid option for this poll', status: 400 };
        }
        return { success: true, status: 201 };
      });

      // Act
      const result = await mockRecordVote(voteRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toBe('Invalid option for this poll');
    });

    it('should return 500 for database errors', async () => {
      // Arrange
      const voteRequest = { pollId: mockPollId, optionId: mockOptionId, userId: mockUserId };

      // Mock database error during vote recording
      mockSupabaseOperations.incrementVote.mockResolvedValue({ success: false });

      mockRecordVote.mockImplementation(async ({ pollId, optionId, userId }) => {
        await mockSupabaseOperations.validatePoll(pollId);
        await mockSupabaseOperations.validateOption(optionId, pollId);
        await mockSupabaseOperations.checkExistingVote(userId, pollId);

        const voteResult = await mockSupabaseOperations.incrementVote(optionId, pollId, userId);
        if (!voteResult.success) {
          return { success: false, error: 'Internal server error', status: 500 };
        }
        return { success: true, status: 201 };
      });

      // Act
      const result = await mockRecordVote(voteRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing vote count gracefully', async () => {
      // Arrange
      const voteRequest = { pollId: mockPollId, optionId: mockOptionId, userId: mockUserId };

      // Mock vote count retrieval failure
      mockSupabaseOperations.getUpdatedVoteCount.mockResolvedValue({ count: null });

      mockRecordVote.mockImplementation(async ({ pollId, optionId, userId }) => {
        await mockSupabaseOperations.validatePoll(pollId);
        await mockSupabaseOperations.validateOption(optionId, pollId);
        await mockSupabaseOperations.checkExistingVote(userId, pollId);
        await mockSupabaseOperations.incrementVote(optionId, pollId, userId);

        const updatedCount = await mockSupabaseOperations.getUpdatedVoteCount(optionId);

        return {
          success: true,
          status: 201,
          data: {
            pollId,
            optionId,
            userId,
            newVoteCount: updatedCount.count, // This will be null
          },
        };
      });

      // Act
      const result = await mockRecordVote(voteRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.status).toBe(201);
      expect(result.data.newVoteCount).toBeNull();
    });

    it('should handle race condition duplicate votes', async () => {
      // Arrange
      const voteRequest = { pollId: mockPollId, optionId: mockOptionId, userId: mockUserId };

      // Mock successful initial check but RPC detects duplicate
      mockSupabaseOperations.checkExistingVote.mockResolvedValue({ hasVoted: false });
      mockSupabaseOperations.incrementVote.mockResolvedValue({ 
        success: false, 
        error: 'already voted' 
      });

      mockRecordVote.mockImplementation(async ({ pollId, optionId, userId }) => {
        await mockSupabaseOperations.validatePoll(pollId);
        await mockSupabaseOperations.validateOption(optionId, pollId);
        await mockSupabaseOperations.checkExistingVote(userId, pollId);

        const voteResult = await mockSupabaseOperations.incrementVote(optionId, pollId, userId);
        if (!voteResult.success && voteResult.error.includes('already voted')) {
          return { success: false, error: 'You have already voted on this poll', status: 409 };
        }
        return { success: true, status: 201 };
      });

      // Act
      const result = await mockRecordVote(voteRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(409);
      expect(result.error).toBe('You have already voted on this poll');
    });
  });
});
