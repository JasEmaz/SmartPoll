import { type NextRequest } from 'next/server'
import { validateAndRefreshSession, AuthSecurity } from '@/lib/supabase'

/**
 * SECURITY FEATURES:
 * 
 * 1. AUTHENTICATION VALIDATION: Server-side user validation on every request
 * 2. AUTOMATIC TOKEN REFRESH: Seamless session renewal
 * 3. ROUTE PROTECTION: Redirect unauthenticated users from protected routes
 * 4. SECURITY HEADERS: Add security headers to all responses
 * 5. REDIRECT HANDLING: Preserve intended destination after login
 */

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/polls/create',
  '/polls/[id]/edit',
  '/api/polls',
  '/api/votes'
];

// Routes that should redirect to dashboard if already authenticated
const AUTH_ROUTES = [
  '/auth/login',
  '/auth/register'
];

// Public routes (no authentication required)
const PUBLIC_ROUTES = [
  '/',
  '/polls/[id]', // Public poll viewing
  '/auth/callback'
];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => {
    if (route.includes('[id]')) {
      // Handle dynamic routes
      const pattern = route.replace('[id]', '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(pathname);
    }
    return pathname.startsWith(route);
  });
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(route => pathname.startsWith(route));
}

function isPublicRoute(pathname: string): boolean {
  if (pathname === '/') return true;
  
  return PUBLIC_ROUTES.some(route => {
    if (route.includes('[id]')) {
      const pattern = route.replace('[id]', '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(pathname);
    }
    return pathname.startsWith(route);
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and API routes that don't need auth
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return;
  }

  // Validate and refresh session
  const { user, response } = await validateAndRefreshSession(request);
  
  // Add security headers to all responses
  const secureResponse = AuthSecurity.addSecurityHeaders(response);

  // Handle authentication logic
  const isAuthenticated = !!user;
  
  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isAuthRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return AuthSecurity.addSecurityHeaders(
      Response.redirect(url)
    );
  }
  
  // Protect routes that require authentication
  if (!isAuthenticated && isProtectedRoute(pathname)) {
    return AuthSecurity.requireAuth(request);
  }
  
  // Allow access to public routes
  if (isPublicRoute(pathname)) {
    return secureResponse;
  }
  
  // For all other routes, require authentication by default (secure by default)
  if (!isAuthenticated) {
    return AuthSecurity.requireAuth(request);
  }
  
  return secureResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - .well-known (for security.txt, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|\.well-known|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
