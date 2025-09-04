import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

/**
 * Create a browser-side Supabase client with minimal privileges
 * Used in client components (with caution)
 */
export function createBrowserClient() {
  return createSupabaseBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Initiate OAuth sign-in (client-side)
 */
export async function signInWithOAuth(provider: 'google' | 'github') {
  const supabase = createBrowserClient();

  const config = {
    google: {
      provider: 'google' as const,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        scopes: 'openid email profile',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    },
    github: {
      provider: 'github' as const,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        scopes: 'user:email',
      },
    },
  };

  try {
    const { data, error } = await supabase.auth.signInWithOAuth(config[provider]);

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error(`OAuth ${provider} sign-in error:`, error);
    return { data: null, error };
  }
}

/**
 * Secure sign out (clears all cookies and sessions)
 */
export async function signOut() {
  const supabase = createBrowserClient();

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.warn('Sign out error:', error.message);
    }

    // Force reload to clear any remaining client state
    window.location.href = '/auth/login';
  } catch (error) {
    console.error('Error during sign out:', error);
    // Force redirect even if sign out fails
    window.location.href = '/auth/login';
  }
}