'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { signOut } from '@/lib/supabase-client';

/**
 * SECURITY FEATURES:
 *
 * 1. SECURE LOGOUT: Clears all cookies and sessions
 * 2. CLIENT-SIDE CLEANUP: Removes any cached data
 * 3. FORCED REDIRECT: Ensures user is redirected to login
 * 4. ERROR HANDLING: Graceful handling of logout failures
 */

export function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await signOut();
      // signOut() handles the redirect
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout fails
      window.location.href = '/auth/login';
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="flex items-center gap-2"
    >
      <LogOut className="h-4 w-4" />
      {isLoggingOut ? 'Logging out...' : 'Logout'}
    </Button>
  );
}
