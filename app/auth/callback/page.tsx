import { createServerClient } from '@/lib/supabase';
import { NextRequest } from 'next/server';
import { redirect } from 'next/navigation';

/**
 * SECURITY FEATURES:
 *
 * 1. SERVER-SIDE CODE EXCHANGE: Secure OAuth code exchange
 * 2. SESSION VALIDATION: Validates received tokens
 * 3. SECURE REDIRECT: Safe redirect to intended destination
 * 4. ERROR HANDLING: Proper error handling for failed OAuth flows
 */

interface SearchParams {
  code?: string;
  error?: string;
  error_description?: string;
  state?: string;
}

interface AuthCallbackProps {
  searchParams: SearchParams;
}

export default async function AuthCallback({ searchParams }: AuthCallbackProps) {
  const { code, error, error_description } = searchParams;

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, error_description);
    const errorMsg = encodeURIComponent(
      error_description || 'Authentication failed. Please try again.'
    );
    redirect(`/auth/login?error=${errorMsg}`);
  }

  // Handle successful OAuth callback with authorization code
  if (code) {
    const supabase = await createServerClient();

    try {
      // Exchange the code for a session
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('Code exchange error:', exchangeError);
        const errorMsg = encodeURIComponent('Authentication failed. Please try again.');
        redirect(`/auth/login?error=${errorMsg}`);
      }

      // Validate the session was created successfully
      if (!data?.session || !data?.user) {
        console.error('No session created after code exchange');
        const errorMsg = encodeURIComponent('Authentication failed. Please try again.');
        redirect(`/auth/login?error=${errorMsg}`);
      }

      // Optional: Store additional user metadata or create user profile
      // await createUserProfile(data.user);

      // Redirect to dashboard on successful authentication
      redirect('/dashboard');
    } catch (error) {
      console.error('Callback processing error:', error);
      const errorMsg = encodeURIComponent('Authentication failed. Please try again.');
      redirect(`/auth/login?error=${errorMsg}`);
    }
  }

  // No code or error - invalid callback
  console.warn('Invalid callback - no code or error provided');
  redirect('/auth/login?error=' + encodeURIComponent('Invalid authentication callback'));
}

