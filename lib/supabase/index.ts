'use client';

// Only re-export client-side functions in the main index
export {
  createClient as createBrowserClient,
  signInWithOAuth,
  signOut
} from './client';

// Don't re-export server functions here - they should be imported directly
// from their respective modules to avoid 'next/headers' in client components