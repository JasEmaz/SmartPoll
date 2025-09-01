import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PollResultChart from '../PollResultChart';

// Mock recharts as it doesn't work well in Jest environment
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => children,
    BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
    Bar: () => <div data-testid="bar"></div>,
    XAxis: () => <div data-testid="x-axis"></div>,
    YAxis: () => <div data-testid="y-axis"></div>,
    CartesianGrid: () => <div data-testid="cartesian-grid"></div>,
    Tooltip: () => <div data-testid="tooltip"></div>,
    Cell: () => <div data-testid="cell"></div>,
  };
});

describe('PollResultChart Data Updates', () => {
  test('updates correctly when poll data changes', () => {
    // Initial poll data
    const initialPollResults = {
      question: 'Initial Question',
      options: [
        { id: '1', option_text: 'Option 1', votes: 10 },
        { id: '2', option_text: 'Option 2', votes: 20 },
      ],
      totalVotes: 30,
    };
    
    const { rerender } = render(<PollResultChart pollResults={initialPollResults} />);
    
    // Check initial render
    expect(screen.getByText(`Poll Results: ${initialPollResults.question}`)).toBeInTheDocument();
    expect(screen.getByText(`Total votes: ${initialPollResults.totalVotes}`)).toBeInTheDocument();
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('10 votes')).toBeInTheDocument();
    
    // Updated poll data
    const updatedPollResults = {
      question: 'Updated Question',
      options: [
        { id: '1', option_text: 'Option 1', votes: 15 },
        { id: '2', option_text: 'Option 2', votes: 25 },
        { id: '3', option_text: 'New Option', votes: 10 },
      ],
      totalVotes: 50,
    };
    
    // Rerender with updated data
    rerender(<PollResultChart pollResults={updatedPollResults} />);
    
    // Check updated render
    expect(screen.getByText(`Poll Results: ${updatedPollResults.question}`)).toBeInTheDocument();
    expect(screen.getByText(`Total votes: ${updatedPollResults.totalVotes}`)).toBeInTheDocument();
    expect(screen.getByText('New Option')).toBeInTheDocument();
    expect(screen.getByText('15 votes')).toBeInTheDocument();
  });

  test('calculates percentages correctly', () => {
    const pollResults = {
      question: 'Test Question',
      options: [
        { id: '1', option_text: 'Option 1', votes: 25 },
        { id: '2', option_text: 'Option 2', votes: 75 },
      ],
      totalVotes: 100,
    };
    
    render(<PollResultChart pollResults={pollResults} />);
    
    // Check if percentages are calculated correctly
    expect(screen.getByText('(25%)')).toBeInTheDocument();
    expect(screen.getByText('(75%)')).toBeInTheDocument();
  });

  test('handles zero votes correctly', () => {
    const pollResults = {
      question: 'Test Question',
      options: [
        { id: '1', option_text: 'Option 1', votes: 0 },
        { id: '2', option_text: 'Option 2', votes: 0 },
      ],
      totalVotes: 0,
    };
    
    render(<PollResultChart pollResults={pollResults} />);
    
    // Check if zero votes are handled correctly
    expect(screen.getByText('No votes yet')).toBeInTheDocument();
    expect(screen.getByText('Be the first to vote on this poll!')).toBeInTheDocument();
    
    // Check if percentages are 0% when totalVotes is 0
    expect(screen.getAllByText('(0%)')).toHaveLength(2);
  });

  test('handles transition from no votes to having votes', () => {
    // Initial state with no votes
    const initialPollResults = {
      question: 'Test Question',
      options: [
        { id: '1', option_text: 'Option 1', votes: 0 },
        { id: '2', option_text: 'Option 2', votes: 0 },
      ],
      totalVotes: 0,
    };
    
    const { rerender } = render(<PollResultChart pollResults={initialPollResults} />);
    
    // Check initial state
    expect(screen.getByText('No votes yet')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    
    // Updated state with votes
    const updatedPollResults = {
      question: 'Test Question',
      options: [
        { id: '1', option_text: 'Option 1', votes: 1 },
        { id: '2', option_text: 'Option 2', votes: 0 },
      ],
      totalVotes: 1,
    };
    
    // Rerender with updated data
    rerender(<PollResultChart pollResults={updatedPollResults} />);
    
    // Check updated state
    expect(screen.queryByText('No votes yet')).not.toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByText('(100%)')).toBeInTheDocument();
    expect(screen.getByText('(0%)')).toBeInTheDocument();
  });
});