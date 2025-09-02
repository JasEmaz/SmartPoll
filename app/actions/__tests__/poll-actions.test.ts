import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createPoll } from '../poll-actions';

// Mock the next/cache module
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// Mock the next/navigation module
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

// Mock the supabase client
jest.mock('../../../lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Import the mocked createClient function
const { createClient } = jest.requireMock('../../../lib/supabase/server');

// Create a mock Supabase client
const mockSupabase = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } }
    }),
    getSession: jest.fn().mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } }
    }),
  },
  from: jest.fn(() => mockFrom),
  rpc: jest.fn(),
};

// Create a mock for the 'from' method chain
const mockFrom = {
  select: jest.fn(() => mockFrom),
  insert: jest.fn(() => mockFrom),
  update: jest.fn(() => mockFrom),
  delete: jest.fn(() => mockFrom),
  eq: jest.fn(() => mockFrom),
  order: jest.fn(() => mockFrom),
  single: jest.fn(() => mockFrom),
};

describe('Poll Actions', () => {
  const mockUser = { id: 'user-123' };
  const mockPollData = {
    question: 'Test question?',
    options: [
      { text: 'Option 1' },
      { text: 'Option 2' },
    ],
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();
    
    // Set up the createClient mock to return our mockSupabase
    createClient.mockReturnValue(mockSupabase);
    
    // Ensure auth.getUser returns a properly structured response
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });
    
    // Mock console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPoll', () => {
    it('should create a poll successfully', async () => {
      // Reset mocks for this specific test
      jest.clearAllMocks();
      createClient.mockReturnValue(mockSupabase);
      
      // Set up separate mocks for polls and poll_options tables
      const mockPollsTable = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'poll-123' },
              error: null
            })
          })
        })
      };

      const mockOptionsTable = {
        insert: jest.fn().mockResolvedValue({
          error: null
        })
      };

      // Mock the from method to return different mocks based on the table
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'polls') {
          return mockPollsTable;
        } else if (table === 'poll_options') {
          return mockOptionsTable;
        }
        return mockFrom;
      });

      // Call the function
      const result = await createPoll(mockPollData);

      // Verify the poll was created
      expect(mockSupabase.from).toHaveBeenCalledWith('polls');
      expect(mockPollsTable.insert).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('poll_options');
      expect(mockOptionsTable.insert).toHaveBeenCalled();
      
      // Verify the result
      expect(result).toEqual({
        success: true,
        pollId: 'poll-123',
      });
    });

    it('should handle invalid input (empty options)', async () => {
      // Reset mocks for this specific test
      jest.clearAllMocks();
      createClient.mockReturnValue(mockSupabase);
      
      // Create invalid poll data with empty options
      const invalidPollData = {
        question: 'Test question?',
        options: [], // Empty options array
      };

      // Set up separate mocks for polls and poll_options tables
      const mockPollsTable = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'poll-123' },
              error: null
            })
          })
        })
      };

      const mockOptionsTable = {
        insert: jest.fn().mockImplementation(() => {
          throw new Error('Options array cannot be empty');
        })
      };

      // Mock the from method to return different mocks based on the table
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'polls') {
          return mockPollsTable;
        } else if (table === 'poll_options') {
          return mockOptionsTable;
        }
        return mockFrom;
      });

      // Call the function
      const result = await createPoll(invalidPollData);

      // Verify error handling
      expect(result).toEqual({
        success: false,
        error: 'Failed to create poll',
      });
      
      // Verify console.error was called
      expect(console.error).toHaveBeenCalled();
    });
  });
});