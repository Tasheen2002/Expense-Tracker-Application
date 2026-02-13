'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const router = useRouter();
  const { data: currentUserResponse, isLoading, error } = useCurrentUser();

  useEffect(() => {
    // If not loading and no user, redirect to login
    if (!isLoading && (!currentUserResponse || error)) {
      router.push(redirectTo);
    }
  }, [isLoading, currentUserResponse, error, router, redirectTo]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!currentUserResponse || error) {
    return null;
  }

  // User is authenticated, show protected content
  return <>{children}</>;
}
