import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { SecurityUtils } from '@/lib/security';

/**
 * Enhanced Poll API Handler with Role-Based Security
 * 
 * SECURITY FEATURES:
 * - User authentication verification
 * - Poll ownership validation
 * - Role-based access control (admin override)
 * - Input sanitization and validation
 * - Rate limiting ready
 * - Comprehensive error handling
 */

/**
 * Check if user has permission to modify a poll
 */
async function verifyPollAccess(
  supabase: any,
  pollId: string,
  userId: string,
  action: 'read' | 'write' | 'delete'
) {
  // Get poll data
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select('user_id')
    .eq('id', pollId)
    .single();

  if (pollError || !poll) {
    return { authorized: false, error: 'Poll not found' };
  }

  // Check if user owns the poll
  const isOwner = poll.user_id === userId;
  
  // Check if user is admin
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
    
  const isAdmin = roleData?.role === 'admin';

  // Permission logic
  switch (action) {
    case 'read':
      return { authorized: true }; // Anyone can read polls
    case 'write':
      return { authorized: isOwner || isAdmin };
    case 'delete':
      return { authorized: isOwner || isAdmin };
    default:
      return { authorized: false, error: 'Invalid action' };
  }
}

/**
 * GET /api/polls/[id] - Get a single poll with options and vote counts
 * Public endpoint - no authentication required
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const pollId = params.id;

    if (!pollId) {
      return NextResponse.json(
        { error: 'Poll ID is required' },
        { status: 400 }
      );
    }

    // Get poll with options and vote counts
    const { data: poll, error } = await supabase
      .from('polls')
      .select(`
        id,
        title,
        description,
        created_at,
        expires_at,
        user_id,
        poll_options (
          id,
          text,
          votes
        )
      `)
      .eq('id', pollId)
      .single();

    if (error) {
      console.error('Database error:', error.message);
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      );
    }

    if (!poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      );
    }

    // Check if poll is expired
    const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();

    // Calculate total votes
    const totalVotes = poll.poll_options?.reduce((sum, option) => sum + option.votes, 0) || 0;

    // Format response
    const response = {
      id: poll.id,
      title: poll.title,
      description: poll.description,
      created_at: poll.created_at,
      expires_at: poll.expires_at,
      is_expired: isExpired,
      total_votes: totalVotes,
      options: poll.poll_options?.map(option => ({
        id: option.id,
        text: option.text,
        votes: option.votes,
        percentage: totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0
      })) || [],
      user_id: poll.user_id
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get poll API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/polls/[id] - Update a poll (owner or admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const pollId = params.id;

    if (!pollId) {
      return NextResponse.json(
        { error: 'Poll ID is required' },
        { status: 400 }
      );
    }

    // Verify authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify poll access
    const accessCheck = await verifyPollAccess(supabase, pollId, user.id, 'write');
    if (!accessCheck.authorized) {
      return NextResponse.json(
        { error: accessCheck.error || 'Permission denied' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { title, description, expires_at, options } = body;

    // Validate and sanitize inputs
    const sanitizedData: any = {};

    if (title !== undefined) {
      const sanitizedTitle = SecurityUtils.sanitizeInput(title);
      if (!sanitizedTitle || sanitizedTitle.length < 3) {
        return NextResponse.json(
          { error: 'Title must be at least 3 characters long' },
          { status: 400 }
        );
      }
      if (sanitizedTitle.length > 200) {
        return NextResponse.json(
          { error: 'Title must not exceed 200 characters' },
          { status: 400 }
        );
      }
      sanitizedData.title = sanitizedTitle;
    }

    if (description !== undefined) {
      const sanitizedDescription = SecurityUtils.sanitizeInput(description);
      if (sanitizedDescription && sanitizedDescription.length > 1000) {
        return NextResponse.json(
          { error: 'Description must not exceed 1000 characters' },
          { status: 400 }
        );
      }
      sanitizedData.description = sanitizedDescription;
    }

    if (expires_at !== undefined) {
      if (expires_at) {
        const expiryDate = new Date(expires_at);
        if (expiryDate <= new Date()) {
          return NextResponse.json(
            { error: 'Expiration date must be in the future' },
            { status: 400 }
          );
        }
        sanitizedData.expires_at = expiryDate.toISOString();
      } else {
        sanitizedData.expires_at = null;
      }
    }

    // Update poll
    sanitizedData.updated_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('polls')
      .update(sanitizedData)
      .eq('id', pollId);

    if (updateError) {
      console.error('Poll update error:', updateError.message);
      return NextResponse.json(
        { error: 'Failed to update poll' },
        { status: 500 }
      );
    }

    // Handle options update if provided
    if (options && Array.isArray(options)) {
      // Get current options
      const { data: currentOptions } = await supabase
        .from('poll_options')
        .select('id, text')
        .eq('poll_id', pollId);

      // Update existing options and add new ones
      for (const option of options) {
        if (!option.text || typeof option.text !== 'string') {
          continue; // Skip invalid options
        }

        const sanitizedOptionText = SecurityUtils.sanitizeInput(option.text);
        if (!sanitizedOptionText || sanitizedOptionText.length > 100) {
          continue; // Skip invalid or too long options
        }

        if (option.id) {
          // Update existing option
          await supabase
            .from('poll_options')
            .update({ text: sanitizedOptionText })
            .eq('id', option.id)
            .eq('poll_id', pollId); // Security: ensure option belongs to this poll
        } else {
          // Add new option
          await supabase
            .from('poll_options')
            .insert({
              poll_id: pollId,
              text: sanitizedOptionText,
              votes: 0
            });
        }
      }
    }

    return NextResponse.json({
      message: 'Poll updated successfully',
      pollId
    });

  } catch (error) {
    console.error('Update poll API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/polls/[id] - Delete a poll (owner or admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const pollId = params.id;

    if (!pollId) {
      return NextResponse.json(
        { error: 'Poll ID is required' },
        { status: 400 }
      );
    }

    // Verify authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify poll access
    const accessCheck = await verifyPollAccess(supabase, pollId, user.id, 'delete');
    if (!accessCheck.authorized) {
      return NextResponse.json(
        { error: accessCheck.error || 'Permission denied' },
        { status: 403 }
      );
    }

    // Check if poll exists
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('id, title, user_id')
      .eq('id', pollId)
      .single();

    if (pollError || !poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      );
    }

    // Delete poll (cascade delete will handle related records)
    const { error: deleteError } = await supabase
      .from('polls')
      .delete()
      .eq('id', pollId);

    if (deleteError) {
      console.error('Poll deletion error:', deleteError.message);
      return NextResponse.json(
        { error: 'Failed to delete poll' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Poll deleted successfully',
      pollId
    });

  } catch (error) {
    console.error('Delete poll API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
