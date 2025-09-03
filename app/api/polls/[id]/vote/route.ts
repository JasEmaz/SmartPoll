import { NextRequest, NextResponse } from 'next/server';
import { votePoll } from '@/app/actions/poll-actions';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { optionId } = body;
    const pollId = params.id;

    // Validate required fields
    if (!optionId) {
      return NextResponse.json(
        { error: 'Option ID is required' },
        { status: 400 }
      );
    }

    if (!pollId) {
      return NextResponse.json(
        { error: 'Poll ID is required' },
        { status: 400 }
      );
    }

    // Submit the vote using the server action
    const result = await votePoll(pollId, optionId);

    if (!result.success) {
      // Return appropriate status based on error type
      const status = result.error?.includes('already voted') ? 409 : 400;
      return NextResponse.json(
        { error: result.error },
        { status }
      );
    }

    return NextResponse.json(
      { message: 'Vote submitted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in vote API:', error);
    
    // Handle authentication errors
    if (error instanceof Error && error.message.includes('logged in')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
