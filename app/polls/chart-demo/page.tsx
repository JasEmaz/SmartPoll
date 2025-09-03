'use client';

import { PollResultChart } from '../../../components/polls';

// Example poll data for demonstration
const examplePollResults = {
  question: 'What is your favorite programming language?',
  options: [
    { id: '1', option_text: 'JavaScript', votes: 45 },
    { id: '2', option_text: 'Python', votes: 38 },
    { id: '3', option_text: 'TypeScript', votes: 32 },
    { id: '4', option_text: 'Rust', votes: 15 },
    { id: '5', option_text: 'Go', votes: 12 },
  ],
  totalVotes: 142,
};

export default function PollResultChartDemo() {
  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Poll Result Chart Demo</h1>
        <p className="text-muted-foreground">
          Example of the PollResultChart component with sample data
        </p>
      </div>
      
      <PollResultChart pollResults={examplePollResults} />
      
      <div className="bg-muted/50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Usage Example:</h3>
        <pre className="text-sm overflow-x-auto">
{`import { PollResultChart } from '@/components/polls';

const pollResults = {
  question: 'Your poll question',
  options: [
    { id: '1', option_text: 'Option 1', votes: 10 },
    { id: '2', option_text: 'Option 2', votes: 15 },
  ],
  totalVotes: 25,
};

<PollResultChart pollResults={pollResults} />`}
        </pre>
      </div>
    </div>
  );
}
