'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // In a real app, this would check Supabase auth state
    // For now, we'll simulate an auth check
    const checkAuth = async () => {
      try {
        // TODO: Replace with actual Supabase auth check
        // const { data: { session } } = await supabase.auth.getSession();
        // const isLoggedIn = !!session;
        
        // For demo purposes, always redirect to login
        const isLoggedIn = false;
        
        setIsAuthenticated(isLoggedIn);
        
        if (!isLoggedIn) {
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/auth/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
}