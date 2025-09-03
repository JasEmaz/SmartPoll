import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PollPage from '../page';

// Mock the auth context
jest.mock('@/app/contexts/auth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
  }),
}));

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: jest.fn().mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'test-poll-id',
          question: 'Test Poll Question',
          user_id: 'test-user-id',
          created_at: '2023-01-01T00:00:00.000Z',
        },
        error: null,
      }),
      insert: jest.fn().mockResolvedValue({ data: { id: 'new-vote-id' }, error: null }),
    })),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  }),
}));

// Mock the PollResultChart component
jest.mock('@/components/polls', () => ({
  PollResultChart: ({ pollResults }: {
    pollResults: {
      question: string;
      totalVotes: number;
      options: Array<{ id: string; option_text: string; votes: number; }>;
    }
  }) => (
    <div data-testid="poll-result-chart">
      <div>Poll Results: {pollResults.question}</div>
      <div>Total Votes: {pollResults.totalVotes}</div>
      <div>
        {pollResults.options.map((option: { id: string; option_text: string; votes: number; }) => (
          <div key={option.id}>
            {option.option_text}: {option.votes} votes
          </div>
        ))}
      </div>
    </div>
  ),
}));

describe('Poll Page', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    // Mock implementation to delay resolution
    jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() => resolve({
        json: () => Promise.resolve({}),
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        redirected: false,
        type: 'basic',
        url: '',
        clone: () => ({} as Response),
        body: null,
        bodyUsed: false,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        blob: () => Promise.resolve(new Blob()),
        formData: () => Promise.resolve(new FormData()),
        text: () => Promise.resolve(''),
      } as Response), 100))
    );

    render(<PollPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('displays poll question and options after loading', async () => {
    // Mock the poll data
    const mockPoll = {
      id: 'test-poll-id',
      question: 'Test Poll Question',
      options: [
        { id: '1', option_text: 'Option 1', votes: 10 },
        { id: '2', option_text: 'Option 2', votes: 20 },
      ],
      totalVotes: 30,
      created_at: '2023-01-01T00:00:00.000Z',
      user_id: 'test-user-id',
    };

    // Mock the useEffect to set poll state
    jest.spyOn(React, 'useEffect').mockImplementationOnce(f => f());
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [mockPoll, jest.fn()]);
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [false, jest.fn()]); // loading
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [null, jest.fn()]); // selectedOption
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [false, jest.fn()]); // hasVoted
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [null, jest.fn()]); // error
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [false, jest.fn()]); // checkingVoteStatus
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [false, jest.fn()]); // showResults

    render(<PollPage />);

    // Check if poll question is displayed
    expect(screen.getByText(mockPoll.question)).toBeInTheDocument();
    
    // Check if voting options are displayed
    mockPoll.options.forEach(option => {
      expect(screen.getByText(option.option_text)).toBeInTheDocument();
    });
  });

  test('shows results when "View Current Results" is clicked', async () => {
    // Mock the poll data
    const mockPoll = {
      id: 'test-poll-id',
      question: 'Test Poll Question',
      options: [
        { id: '1', option_text: 'Option 1', votes: 10 },
        { id: '2', option_text: 'Option 2', votes: 20 },
      ],
      totalVotes: 30,
      created_at: '2023-01-01T00:00:00.000Z',
      user_id: 'test-user-id',
    };

    // Mock useState for poll and showResults
    const useStateMock = jest.spyOn(React, 'useState');
    useStateMock.mockImplementationOnce(() => [mockPoll, jest.fn()]); // poll
    useStateMock.mockImplementationOnce(() => [false, jest.fn()]); // loading
    useStateMock.mockImplementationOnce(() => [null, jest.fn()]); // selectedOption
    useStateMock.mockImplementationOnce(() => [false, jest.fn()]); // hasVoted
    useStateMock.mockImplementationOnce(() => [null, jest.fn()]); // error
    useStateMock.mockImplementationOnce(() => [false, jest.fn()]); // checkingVoteStatus
    
    // Mock showResults state with a function that can be called
    let showResultsState = false;
    const setShowResults = jest.fn(val => { showResultsState = val; });
    useStateMock.mockImplementationOnce(() => [showResultsState, setShowResults]);

    const { rerender } = render(<PollPage />);

    // Find and click the "View Current Results" button
    const viewResultsButton = screen.getByText('View Current Results');
    fireEvent.click(viewResultsButton);

    // Check if setShowResults was called with true
    expect(setShowResults).toHaveBeenCalledWith(true);

    // Update the showResults state and rerender
    useStateMock.mockImplementationOnce(() => [mockPoll, jest.fn()]); // poll
    useStateMock.mockImplementationOnce(() => [false, jest.fn()]); // loading
    useStateMock.mockImplementationOnce(() => [null, jest.fn()]); // selectedOption
    useStateMock.mockImplementationOnce(() => [false, jest.fn()]); // hasVoted
    useStateMock.mockImplementationOnce(() => [null, jest.fn()]); // error
    useStateMock.mockImplementationOnce(() => [false, jest.fn()]); // checkingVoteStatus
    useStateMock.mockImplementationOnce(() => [true, setShowResults]); // showResults = true

    rerender(<PollPage />);

    // Check if PollResultChart is rendered
    expect(screen.getByTestId('poll-result-chart')).toBeInTheDocument();
    expect(screen.getByText('Current Results')).toBeInTheDocument();
  });
});