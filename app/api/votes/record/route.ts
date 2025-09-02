import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface VoteRequest {
  pollId: string;
  optionId: string;
  userId?: string; // Optional for testing purposes
}

export async function POST(request: NextRequest) {
  try {
    const body: VoteRequest = await request.json();
    const { pollId, optionId, userId } = body;

    // Validate required fields
    if (!pollId || !optionId) {
      return NextResponse.json(
        { error: 'Poll ID and Option ID are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get user ID (from request body for testing or from auth)
    let currentUserId = userId;
    if (!currentUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      
      currentUserId = user.id;
    }

    // Check if poll exists and get poll details
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('id, question, expires_at')
      .eq('id', pollId)
      .single();

    if (pollError || !poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      );
    }

    // Check if poll has expired
    if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Poll has expired' },
        { status: 410 }
      );
    }

    // Check if option exists for this poll
    const { data: option, error: optionError } = await supabase
      .from('poll_options')
      .select('id, poll_id')
      .eq('id', optionId)
      .eq('poll_id', pollId)
      .single();

    if (optionError || !option) {
      return NextResponse.json(
        { error: 'Invalid option for this poll' },
        { status: 400 }
      );
    }

    // Check if user has already voted on this poll
    const { data: existingVote, error: voteCheckError } = await supabase
      .from('votes')
      .select('id')
      .eq('user_id', currentUserId)
      .eq('poll_id', pollId)
      .single();

    if (voteCheckError && voteCheckError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is expected for new votes
      throw voteCheckError;
    }

    if (existingVote) {
      return NextResponse.json(
        { error: 'You have already voted on this poll' },
        { status: 409 }
      );
    }

    // Record the vote using the RPC function for atomic operation
    const { error: rpcError } = await supabase.rpc('increment_vote', {
      option_id: optionId,
      poll_id: pollId,
      user_id: currentUserId
    });

    if (rpcError) {
      if (rpcError.message.includes('already voted')) {
        return NextResponse.json(
          { error: 'You have already voted on this poll' },
          { status: 409 }
        );
      }
      throw rpcError;
    }

    // Get updated vote count for the option
    const { data: updatedOption, error: updateError } = await supabase
      .from('poll_options')
      .select('votes')
      .eq('id', optionId)
      .single();

    if (updateError) {
      console.warn('Could not fetch updated vote count:', updateError);
    }

    // Revalidate the poll page
    revalidatePath(`/polls/${pollId}`);

    return NextResponse.json({
      success: true,
      message: 'Vote recorded successfully',
      data: {
        pollId,
        optionId,
        userId: currentUserId,
        newVoteCount: updatedOption?.votes || null
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error recording vote:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
