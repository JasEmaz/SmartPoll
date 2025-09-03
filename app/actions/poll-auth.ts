import { getSupabaseClient } from './poll-client';
import type { UserAuthData } from './poll-types';

/**
 * Authentication result interface
 */
interface AuthResult {
  success: boolean;
  user?: UserAuthData;
  error?: string;
}

/**
 * Get the current authenticated user
 * @throws Error if user is not authenticated
 * @returns Promise<UserAuthData> - The authenticated user data
 */
export async function getCurrentUser(): Promise<UserAuthData> {
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Authentication error:', error);
      throw new Error('Authentication failed');
    }
    
    if (!data.user) {
      throw new Error('Authentication required');
    }
    
    return {
      id: data.user.id,
      email: data.user.email || undefined
    };
  } catch (error) {
    console.error('Failed to get current user:', error);
    throw new Error('Authentication required');
  }
}

/**
 * Get the current user without throwing an error
 * @returns Promise<AuthResult> - The authentication result
 */
export async function getCurrentUserSafe(): Promise<AuthResult> {
  try {
    const user = await getCurrentUser();
    return {
      success: true,
      user
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    };
  }
}

/**
 * Check if the current user is authenticated
 * @returns Promise<boolean> - True if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    await getCurrentUser();
    return true;
  } catch {
    return false;
  }
}

/**
 * Verify poll ownership by the current user
 * @param pollId - The ID of the poll to check ownership for
 * @returns Promise<boolean> - True if the current user owns the poll
 */
export async function verifyPollOwnership(pollId: string): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('polls')
      .select('user_id')
      .eq('id', pollId)
      .single();
    
    if (error || !data) {
      return false;
    }
    
    return data.user_id === user.id;
  } catch {
    return false;
  }
}

/**
 * Get user authentication status with detailed information
 * @returns Promise<AuthResult & { isAuthenticated: boolean }>
 */
export async function getAuthStatus(): Promise<AuthResult & { isAuthenticated: boolean }> {
  const result = await getCurrentUserSafe();
  return {
    ...result,
    isAuthenticated: result.success
  };
}

/**
 * Require authentication and return user data
 * @param operation - The operation name for better error messages
 * @returns Promise<UserAuthData> - The authenticated user data
 * @throws Error if user is not authenticated
 */
export async function requireAuth(operation: string = 'this operation'): Promise<UserAuthData> {
  try {
    return await getCurrentUser();
  } catch (error) {
    throw new Error(`Authentication required for ${operation}`);
  }
}
