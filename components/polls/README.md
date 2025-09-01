# PollResultChart Component

A React component for displaying poll results using interactive charts built with recharts and styled with shadcn/ui and Tailwind CSS.

## Features

- **Interactive Bar Chart**: Displays poll results in an easy-to-read bar chart format
- **Responsive Design**: Automatically adapts to different screen sizes
- **Custom Tooltips**: Shows detailed vote information on hover
- **Color-coded Options**: Each poll option has a distinct color
- **Detailed Results Table**: Shows vote counts and percentages below the chart
- **Empty State**: Handles polls with no votes gracefully
- **TypeScript Support**: Fully typed with TypeScript interfaces

## Installation

The component requires the following dependencies:

```bash
npm install recharts
```

## Usage

```tsx
import { PollResultChart } from '@/components/polls';

const pollResults = {
  question: 'What is your favorite programming language?',
  options: [
    { id: '1', text: 'JavaScript', votes: 45 },
    { id: '2', text: 'Python', votes: 38 },
    { id: '3', text: 'TypeScript', votes: 32 },
  ],
  totalVotes: 115,
};

<PollResultChart pollResults={pollResults} />
```

## Props

### PollResultChartProps

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `pollResults` | `PollResults` | Yes | The poll data to display |
| `className` | `string` | No | Additional CSS classes |

### PollResults Interface

```typescript
interface PollResults {
  question: string;
  options: PollOption[];
  totalVotes: number;
}

interface PollOption {
  id: string;
  text: string;
  votes: number;
}
```

## Styling

The component uses:
- **shadcn/ui Card components** for the container
- **Tailwind CSS** for responsive styling
- **CSS custom properties** for theme colors (primary, secondary, accent, etc.)
- **recharts** for the interactive chart

## Color Palette

The chart uses a predefined color palette that cycles through:
- Primary color
- Secondary color
- Accent color
- Muted color
- Destructive color
- Ring color

## Accessibility

- Chart is responsive and works on mobile devices
- Tooltips provide additional context
- Color-coded legend helps distinguish between options
- Text is properly sized for readability

## Example

See the demo page at `/polls/chart-demo` for a working example of the component.

## Integration with Existing Poll System

The component is designed to work seamlessly with the existing poll data structure used in the application. It can be easily integrated into:

- Poll result pages
- Dashboard overviews
- Share pages
- Admin panels

## Customization

You can customize the component by:
- Modifying the color palette
- Adjusting chart dimensions
- Changing the tooltip content
- Adding additional chart types (pie chart, line chart, etc.)
- Customizing the detailed results table layout
