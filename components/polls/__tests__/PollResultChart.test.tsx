import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PollResultChart from '../PollResultChart';

// Mock data for testing
const mockPollResults = {
  question: 'What is your favorite programming language?',
  options: [
    { id: '1', option_text: 'JavaScript', votes: 15 },
    { id: '2', option_text: 'Python', votes: 10 },
    { id: '3', option_text: 'TypeScript', votes: 8 },
    { id: '4', option_text: 'Rust', votes: 2 },
  ],
  totalVotes: 35,
};

// Mock empty poll for testing empty state
const emptyPollResults = {
  question: 'Empty Poll',
  options: [
    { id: '1', option_text: 'Option 1', votes: 0 },
    { id: '2', option_text: 'Option 2', votes: 0 },
  ],
  totalVotes: 0,
};

// Mock recharts to avoid complex chart rendering in tests
jest.mock('recharts', () => ({
  BarChart: ({ children, data }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Bar: ({ dataKey }: any) => <div data-testid="bar" data-key={dataKey} />,
  XAxis: ({ dataKey }: any) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: ({ content }: any) => <div data-testid="tooltip">{content}</div>,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Cell: ({ fill }: any) => <div data-testid="cell" style={{ backgroundColor: fill }} />,
}));

describe('PollResultChart Component', () => {
  test('renders poll question and total votes', () => {
    render(<PollResultChart pollResults={mockPollResults} />);
    
    expect(screen.getByText(`Poll Results: ${mockPollResults.question}`)).toBeInTheDocument();
    expect(screen.getByText(`Total votes: ${mockPollResults.totalVotes}`)).toBeInTheDocument();
  });

  test('renders chart components when there are votes', () => {
    render(<PollResultChart pollResults={mockPollResults} />);
    
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
  });

  test('displays detailed results with correct vote counts and percentages', () => {
    render(<PollResultChart pollResults={mockPollResults} />);
    
    // Check for each option in the detailed results
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('15 votes')).toBeInTheDocument();
    expect(screen.getByText('(43%)')).toBeInTheDocument();
    
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('10 votes')).toBeInTheDocument();
    expect(screen.getByText('(29%)')).toBeInTheDocument();
    
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('8 votes')).toBeInTheDocument();
    expect(screen.getByText('(23%)')).toBeInTheDocument();
    
    expect(screen.getByText('Rust')).toBeInTheDocument();
    expect(screen.getByText('2 votes')).toBeInTheDocument();
    expect(screen.getByText('(6%)')).toBeInTheDocument();
  });

  test('renders "No votes yet" message when totalVotes is 0', () => {
    render(<PollResultChart pollResults={emptyPollResults} />);
    
    expect(screen.getByText('No votes yet')).toBeInTheDocument();
    expect(screen.getByText('Be the first to vote on this poll!')).toBeInTheDocument();
    
    // Chart should not be rendered
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  test('calculates percentages correctly for zero votes', () => {
    render(<PollResultChart pollResults={emptyPollResults} />);
    
    // Check that detailed results still show with 0% (multiple elements expected)
    const zeroVotesElements = screen.getAllByText('0 votes');
    expect(zeroVotesElements).toHaveLength(2); // Two options with 0 votes each
    
    const zeroPercentageElements = screen.getAllByText('(0%)');
    expect(zeroPercentageElements).toHaveLength(2); // Two options with 0% each
  });

  test('handles single option polls correctly', () => {
    const singleOptionPoll = {
      question: 'Is this a valid poll?',
      options: [
        { id: '1', option_text: 'Yes', votes: 100 },
      ],
      totalVotes: 100,
    };

    render(<PollResultChart pollResults={singleOptionPoll} />);
    
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('100 votes')).toBeInTheDocument();
    expect(screen.getByText('(100%)')).toBeInTheDocument();
  });

  test('applies custom className when provided', () => {
    const { container } = render(
      <PollResultChart pollResults={mockPollResults} className="custom-class" />
    );
    
    const cardElement = container.querySelector('.custom-class');
    expect(cardElement).toBeInTheDocument();
  });

  test('renders detailed results section', () => {
    render(<PollResultChart pollResults={mockPollResults} />);
    
    expect(screen.getByText('Detailed Results')).toBeInTheDocument();
  });

  test('handles very large vote counts', () => {
    const largePollResults = {
      question: 'Popular poll?',
      options: [
        { id: '1', option_text: 'Option 1', votes: 999999 },
        { id: '2', option_text: 'Option 2', votes: 1 },
      ],
      totalVotes: 1000000,
    };

    render(<PollResultChart pollResults={largePollResults} />);
    
    expect(screen.getByText('999999 votes')).toBeInTheDocument();
    expect(screen.getByText('(100%)')).toBeInTheDocument(); // Rounded to 100%
    expect(screen.getByText('1 votes')).toBeInTheDocument();
    expect(screen.getByText('(0%)')).toBeInTheDocument(); // Rounded to 0%
  });

  test('handles polls with many options (more than color palette)', () => {
    const manyOptionsPoll = {
      question: 'Many options poll?',
      options: Array.from({ length: 10 }, (_, i) => ({
        id: (i + 1).toString(),
        option_text: `Option ${i + 1}`,
        votes: i + 1,
      })),
      totalVotes: 55, // 1+2+3+...+10
    };

    render(<PollResultChart pollResults={manyOptionsPoll} />);
    
    // Should handle color cycling correctly
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 10')).toBeInTheDocument();
    expect(screen.getByText('Total votes: 55')).toBeInTheDocument();
  });

  test('handles empty options array', () => {
    const emptyOptionsPoll = {
      question: 'Empty options poll?',
      options: [],
      totalVotes: 0,
    };

    render(<PollResultChart pollResults={emptyOptionsPoll} />);
    
    expect(screen.getByText('No votes yet')).toBeInTheDocument();
    expect(screen.getByText('Total votes: 0')).toBeInTheDocument();
  });

  test('handles options with special characters in text', () => {
    const specialCharsPoll = {
      question: 'Special characters poll?',
      options: [
        { id: '1', option_text: 'Option with "quotes" & symbols!', votes: 5 },
        { id: '2', option_text: 'Option with <tags>', votes: 3 },
        { id: '3', option_text: 'Option with émojis 🚀', votes: 2 },
      ],
      totalVotes: 10,
    };

    render(<PollResultChart pollResults={specialCharsPoll} />);
    
    expect(screen.getByText('Option with "quotes" & symbols!')).toBeInTheDocument();
    expect(screen.getByText('Option with <tags>')).toBeInTheDocument();
    expect(screen.getByText('Option with émojis 🚀')).toBeInTheDocument();
  });

  test('passes correct data to the chart component', () => {
    render(<PollResultChart pollResults={mockPollResults} />);
    
    const chartElement = screen.getByTestId('bar-chart');
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]');
    
    expect(chartData).toHaveLength(4);
    expect(chartData[0]).toEqual({
      name: 'JavaScript',
      votes: 15,
      percentage: 43,
      color: expect.any(String),
    });
  });

  test('calculates percentages correctly with rounding', () => {
    const unevenPoll = {
      question: 'Uneven distribution?',
      options: [
        { id: '1', option_text: 'Option 1', votes: 1 },
        { id: '2', option_text: 'Option 2', votes: 1 },
        { id: '3', option_text: 'Option 3', votes: 1 },
      ],
      totalVotes: 3,
    };

    render(<PollResultChart pollResults={unevenPoll} />);
    
    // 1/3 = 33.33%, should round to 33%
    const percentageElements = screen.getAllByText('(33%)');
    expect(percentageElements).toHaveLength(3);
  });

  test('renders with minimal props', () => {
    const minimalPoll = {
      question: 'Minimal poll?',
      options: [
        { id: '1', option_text: 'Yes', votes: 1 },
        { id: '2', option_text: 'No', votes: 0 },
      ],
      totalVotes: 1,
    };

    render(<PollResultChart pollResults={minimalPoll} />);
    
    expect(screen.getByText('Poll Results: Minimal poll?')).toBeInTheDocument();
    expect(screen.getByText('Total votes: 1')).toBeInTheDocument();
  });
});