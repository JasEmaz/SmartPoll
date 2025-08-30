'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from './button';

export default function Navbar() {
  const pathname = usePathname();
  
  // This would be replaced with actual auth state from Supabase
  const isLoggedIn = false;

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl">Smart Poll</span>
          </Link>
          <nav className="hidden gap-6 md:flex">
            <Link 
              href="/dashboard" 
              className={`text-sm font-medium transition-colors hover:text-primary ${pathname === '/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              Dashboard
            </Link>
            <Link 
              href="/polls/create" 
              className={`text-sm font-medium transition-colors hover:text-primary ${pathname === '/polls/create' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              Create Poll
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <Button variant="ghost" asChild>
              <Link href="/api/auth/signout">Sign Out</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/auth/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/register">Register</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}