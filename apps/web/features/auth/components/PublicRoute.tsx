'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '../hooks/useAuth';

interface PublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function PublicRoute({
  children,
  redirectTo = '/workspaces',
}: PublicRouteProps) {
  const router = useRouter();
  const { data: currentUserResponse, isLoading } = useCurrentUser();

  useEffect(() => {
    // If user is authenticated, redirect to app
    if (!isLoading && currentUserResponse?.data) {
      router.push(redirectTo);
    }
  }, [isLoading, currentUserResponse, router, redirectTo]);

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

  // User is not authenticated, show public content (login/register)
  if (!currentUserResponse?.data) {
    return <>{children}</>;
  }

  // User is authenticated, show nothing while redirecting
  return null;
}
