'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WorkspacesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    async function redirectToWorkspace() {
      try {
        const token = localStorage.getItem('auth-token');
        console.log('Token exists:', !!token);

        if (!token) {
          console.log('No token, redirecting to login');
          router.push('/login');
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        console.log('Fetching workspaces from:', `${apiUrl}/workspaces`);

        const response = await fetch(`${apiUrl}/workspaces`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        console.log('Workspaces fetch response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('Workspaces data:', data);
          let workspaces = data.data?.items || [];

          if (workspaces.length === 0) {
            console.log('No workspaces, creating one...');
            // No workspaces, create a default one with timestamp for uniqueness
            const timestamp = Date.now();
            const workspaceName = `My Workspace ${timestamp}`;

            const createResponse = await fetch(`${apiUrl}/workspaces`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: workspaceName,
              }),
            });

            console.log('Create workspace response status:', createResponse.status);

            if (createResponse.ok) {
              const newWorkspace = await createResponse.json();
              console.log('New workspace created:', newWorkspace);
              workspaces = [newWorkspace.data];
            } else {
              const errorData = await createResponse.text();
              console.error('Failed to create workspace:', errorData);
            }
          }

          if (workspaces.length > 0) {
            const redirectUrl = `/workspaces/${workspaces[0].workspaceId}`;
            console.log('Redirecting to workspace:', redirectUrl);
            router.push(redirectUrl);
          } else {
            console.error('No workspaces available after creation attempt');
            // If still no workspace after creation attempt, stay on loading
            // Don't redirect to home to avoid infinite loop
          }
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch workspaces:', response.status, errorText);
          router.push('/login');
        }
      } catch (error) {
        console.error('Error in workspace redirect:', error);
        router.push('/login');
      }
    }

    redirectToWorkspace();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
        </div>
        <p className="text-muted-foreground">Loading your workspace...</p>
      </div>
    </div>
  );
}
