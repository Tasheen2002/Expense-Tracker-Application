import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ============================================================================
// Authentication Middleware
// ============================================================================

// Routes that require authentication
const protectedRoutes = [
  '/workspaces',
  '/account',
  '/settings',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Get token from localStorage (via cookie or header in production)
  // Note: In production, you might want to use httpOnly cookies instead
  const token = request.cookies.get('auth-token')?.value;

  // Redirect to login if accessing protected route without token
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to workspaces if accessing login/register with valid token
  if ((pathname === '/login' || pathname === '/register') && token) {
    return NextResponse.redirect(new URL('/workspaces', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
