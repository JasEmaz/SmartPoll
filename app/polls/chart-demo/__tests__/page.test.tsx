import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PollResultChartDemo from '../page';

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
          <div key={option.id} data-testid="poll-option">
            {option.option_text}: {option.votes} votes
          </div>
        ))}
      </div>
    </div>
  ),
}));

describe('Poll Result Chart Demo Page', () => {
  test('renders the page title', () => {
    render(<PollResultChartDemo />);
    expect(screen.getByText('Poll Result Chart Demo')).toBeInTheDocument();
  });

  test('renders the PollResultChart component with example data', () => {
    render(<PollResultChartDemo />);
    
    // Check if the chart is rendered
    expect(screen.getByTestId('poll-result-chart')).toBeInTheDocument();
    
    // Check if the example poll question is passed to the component
    expect(screen.getByText('Poll Results: What is your favorite programming language?')).toBeInTheDocument();
    
    // Check if the total votes are correct
    expect(screen.getByText('Total Votes: 142')).toBeInTheDocument();
    
    // Check if all options are rendered
    const options = screen.getAllByTestId('poll-option');
    expect(options).toHaveLength(5); // There should be 5 options in the example data
    
    // Check specific options
    expect(screen.getByText('JavaScript: 45 votes')).toBeInTheDocument();
    expect(screen.getByText('Python: 38 votes')).toBeInTheDocument();
    expect(screen.getByText('TypeScript: 32 votes')).toBeInTheDocument();
    expect(screen.getByText('Rust: 15 votes')).toBeInTheDocument();
    expect(screen.getByText('Go: 12 votes')).toBeInTheDocument();
  });

  test('renders the usage example code', () => {
    render(<PollResultChartDemo />);
    
    // Check if the usage example section is rendered
    expect(screen.getByText('Usage Example:')).toBeInTheDocument();
    
    // Check if the code example contains the import statement
    const preElement = screen.getByText(/import { PollResultChart } from/i);
    expect(preElement).toBeInTheDocument();
    
    // Check if the code example contains the component usage
    expect(preElement.textContent).toContain('<PollResultChart pollResults={pollResults} />');
  });
});