# Testing Documentation for Smart Poll

## Overview

This document outlines the testing approach for the Smart Poll application, focusing on unit tests for components and pages using Jest and React Testing Library.

## Testing Stack

- **Jest**: JavaScript testing framework
- **React Testing Library**: Testing utilities for React components
- **jest-dom**: Custom Jest matchers for DOM testing

## Test Structure

Tests are organized following the same structure as the application code:

- Component tests are located in `__tests__` folders next to the components they test
- Page tests are located in `__tests__` folders within their respective page directories

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests for a specific file
npm test -- PollResultChart.test.tsx
```

## Test Coverage

To generate a test coverage report:

```bash
npm test -- --coverage
```

This will create a coverage report in the `coverage` directory.

## Mocking Strategy

### External Dependencies

- **Supabase Client**: Mocked to return predefined data without making actual API calls
- **Next.js Navigation**: Router, params, and search params are mocked
- **Authentication Context**: User authentication state is mocked

### UI Components

- **Recharts**: Mocked to render simple test components instead of complex charts
- **UI Components**: Shadcn UI components are rendered as-is for integration tests

## Test Types

### Component Tests

Component tests focus on:
- Correct rendering of UI elements
- Component props handling
- State changes and updates
- User interactions

### Page Tests

Page tests focus on:
- Integration of multiple components
- Data fetching and state management
- User flows and interactions
- Error handling

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the component does, not how it does it
2. **Use Accessible Queries**: Prefer queries like `getByRole`, `getByLabelText`, and `getByText` over `getByTestId`
3. **Mock Minimal Dependencies**: Only mock what's necessary to isolate the component under test
4. **Test Edge Cases**: Include tests for empty states, loading states, and error states
5. **Keep Tests Independent**: Each test should be able to run independently of others

## Example Test

```tsx
import { render, screen } from '@testing-library/react';
import PollResultChart from '../PollResultChart';

test('renders poll question and total votes', () => {
  const mockPollResults = {
    question: 'Test Question',
    options: [
      { id: '1', text: 'Option 1', votes: 10 },
      { id: '2', text: 'Option 2', votes: 20 },
    ],
    totalVotes: 30,
  };
  
  render(<PollResultChart pollResults={mockPollResults} />);
  
  expect(screen.getByText(`Poll Results: ${mockPollResults.question}`)).toBeInTheDocument();
  expect(screen.getByText(`Total votes: ${mockPollResults.totalVotes}`)).toBeInTheDocument();
});
```