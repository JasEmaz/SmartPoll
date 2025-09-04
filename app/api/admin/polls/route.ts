import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { logger, createSafeErrorResponse } from '@/lib/logger';

// --- Data Access Layer (DTO Transformation) ---

/**
 * Represents the publicly safe data for a poll.
 */
interface PublicPoll {
  id: string;
  question: string;
  expires_at: string | null;
}

/**
 * Transforms a database poll object into a publicly safe poll object.
 * This acts as a data access layer to control data exposure.
 *
 * @param poll - The poll object from the database.
 * @returns A new object with only the allowed fields.
 */
function toPublicPoll(poll: any): PublicPoll {
  return {
    id: poll.id,
    question: poll.title, // Renaming 'title' to 'question' for public consistency
    expires_at: poll.expires_at,
  };
}


// --- Security Verification ---

/**
 * Verify admin privileges for the current user.
 * This remains unchanged as it's critical for the admin endpoint.
 */
async function verifyAdminAccess() {
  const supabase = createRouteHandlerClient({ cookies });
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (roleError) {
    logger.error('Role check database error', { component: 'AdminPollsAPI' }, roleError);
    return { error: 'Permission verification failed', status: 500 };
  }

  if (!roleData || roleData.role !== 'admin') {
    return { error: 'Admin access required', status: 403 };
  }

  return { user, supabase };
}


// --- API Route Handlers ---

/**
 * GET /api/admin/polls - List all polls with SECURE, MINIMAL information
 */
export async function GET(request: NextRequest) {
  try {
    const verification = await verifyAdminAccess();
    if ('error' in verification) {
      return NextResponse.json(
        createSafeErrorResponse(null, verification.error),
        { status: verification.status }
      );
    }

    const { supabase } = verification;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    // The query remains complex on the backend to allow admin filtering,
    // but the response will be sanitized.
    const { data: polls, error, count } = await supabase
      .from('polls')
      .select('id, title, expires_at', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      // Log the detailed error for internal debugging
      logger.error('Failed to fetch polls from database', { component: 'AdminPollsAPI' }, error);
      // Return a generic, safe error response to the client
      return NextResponse.json(
        createSafeErrorResponse(error, 'Failed to fetch polls due to a database error.'),
        { status: 500 }
      );
    }

    // --- Apply the Data Access Layer transformation ---
    const safePolls: PublicPoll[] = polls?.map(toPublicPoll) || [];

    return NextResponse.json({
      polls: safePolls,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    logger.error('Unhandled error in GET /api/admin/polls', { component: 'AdminPollsAPI' }, error);
    return NextResponse.json(
      createSafeErrorResponse(error, 'An internal server error occurred.'),
      { status: 500 }
    );
  }
}

// NOTE: DELETE and PATCH handlers have been removed for this example to focus on the GET request.
// In a real-world scenario, you would apply similar error masking and logging to them.