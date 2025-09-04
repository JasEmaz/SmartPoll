import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * Admin API Handler for User Management
 * 
 * SECURITY FEATURES:
 * - Role-based access control (admin only)
 * - User ownership validation
 * - Comprehensive error handling
 * - Audit logging
 */

interface AdminUserData {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at: string;
  polls_created: number;
  votes_cast: number;
}

/**
 * Verify admin privileges for the current user
 */
async function verifyAdminAccess() {
  const supabase = createRouteHandlerClient({ cookies });
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  // Check admin role
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (roleError) {
    console.error('Role check error:', roleError.message);
    return { error: 'Permission verification failed', status: 500 };
  }

  if (!roleData || roleData.role !== 'admin') {
    return { error: 'Admin access required', status: 403 };
  }

  return { user, supabase };
}

/**
 * GET /api/admin/users - List all users with their roles and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const verification = await verifyAdminAccess();
    if ('error' in verification) {
      return NextResponse.json(
        { error: verification.error },
        { status: verification.status }
      );
    }

    const { supabase } = verification;

    // Get search parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Max 100 per page
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    
    const offset = (page - 1) * limit;

    // Build query with joins for user statistics
    let query = supabase
      .from('auth.users')
      .select(`
        id,
        email,
        created_at,
        last_sign_in_at,
        user_roles!left (role),
        polls!left (id),
        votes!left (id)
      `);

    // Add search filter
    if (search) {
      query = query.ilike('email', `%${search}%`);
    }

    // Add role filter
    if (role) {
      query = query.eq('user_roles.role', role);
    }

    // Add pagination
    const { data: users, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error.message);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Transform data to include statistics
    const transformedUsers: AdminUserData[] = users?.map(user => ({
      id: user.id,
      email: user.email,
      role: user.user_roles?.[0]?.role || 'user',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      polls_created: user.polls?.length || 0,
      votes_cast: user.votes?.length || 0
    })) || [];

    return NextResponse.json({
      users: transformedUsers,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users - Update user role
 */
export async function PATCH(request: NextRequest) {
  try {
    const verification = await verifyAdminAccess();
    if ('error' in verification) {
      return NextResponse.json(
        { error: verification.error },
        { status: verification.status }
      );
    }

    const { user: adminUser, supabase } = verification;

    const body = await request.json();
    const { userId, role } = body;

    // Validate input
    if (!userId || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, role' },
        { status: 400 }
      );
    }

    // Validate role value
    if (!['user', 'admin', 'moderator'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be: user, admin, or moderator' },
        { status: 400 }
      );
    }

    // Prevent self-demotion (admin removing their own admin role)
    if (userId === adminUser.id && role !== 'admin') {
      return NextResponse.json(
        { error: 'Cannot modify your own admin privileges' },
        { status: 400 }
      );
    }

    // Update or insert user role
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert(
        {
          user_id: userId,
          role: role,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id'
        }
      );

    if (roleError) {
      console.error('Role update error:', roleError.message);
      return NextResponse.json(
        { error: 'Failed to update user role' },
        { status: 500 }
      );
    }

    // Log admin action
    await supabase
      .from('audit_logs')
      .insert({
        user_id: adminUser.id,
        action: 'UPDATE_USER_ROLE',
        table_name: 'user_roles',
        record_id: userId,
        new_values: { role },
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      message: 'User role updated successfully',
      userId,
      newRole: role
    });

  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users - Delete user account (admin moderation)
 */
export async function DELETE(request: NextRequest) {
  try {
    const verification = await verifyAdminAccess();
    if ('error' in verification) {
      return NextResponse.json(
        { error: verification.error },
        { status: verification.status }
      );
    }

    const { user: adminUser, supabase } = verification;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // Prevent self-deletion
    if (userId === adminUser.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Check if target user exists
    const { data: targetUser, error: userError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete user data (cascade delete will handle related records)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('User deletion error:', deleteError.message);
      return NextResponse.json(
        { error: 'Failed to delete user account' },
        { status: 500 }
      );
    }

    // Log admin action
    await supabase
      .from('audit_logs')
      .insert({
        user_id: adminUser.id,
        action: 'DELETE_USER',
        table_name: 'auth.users',
        record_id: userId,
        old_values: { email: targetUser.email },
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      message: 'User account deleted successfully',
      deletedUserId: userId
    });

  } catch (error) {
    console.error('Admin user deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
