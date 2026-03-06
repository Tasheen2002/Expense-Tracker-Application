'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '../api/auth.api';
import type { AuthResponse, ApiResponse } from '@/types';

// ============================================================================
// Auth Query Keys
// ============================================================================

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
};

// ============================================================================
// useCurrentUser - Get authenticated user
// ============================================================================

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: authApi.me,
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('auth-token'),
    retry: false,
  });
}

// ============================================================================
// useRegister - Register new user
// ============================================================================

export function useRegister() {
  const router = useRouter();

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      // Redirect to login after successful registration
      router.push('/login?registered=true');
    },
  });
}

// ============================================================================
// useLogin - Login user
// ============================================================================

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async (response: ApiResponse<AuthResponse>) => {
      // Store token in localStorage and cookies
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth-token', response.data.token);
        // Also set as cookie for middleware
        document.cookie = `auth-token=${response.data.token}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
      }

      // Invalidate and refetch current user
      queryClient.invalidateQueries({ queryKey: authKeys.me() });

      // Redirect to /workspaces which will handle workspace fetching/creation and redirect
      setTimeout(() => {
        window.location.href = '/workspaces';
      }, 100);
    },
  });
}

// ============================================================================
// useLogout - Logout user
// ============================================================================

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // Clear localStorage and cookies
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-token');
        document.cookie = 'auth-token=; path=/; max-age=0'; // Clear cookie
      }

      // Clear all cached data
      queryClient.clear();

      // Redirect to login
      router.push('/login');
    },
  });
}

// ============================================================================
// useAuth - Combined auth hook
// ============================================================================

export function useAuth() {
  const { data: currentUserResponse, isLoading, error } = useCurrentUser();
  const login = useLogin();
  const logout = useLogout();
  const register = useRegister();

  return {
    user: currentUserResponse?.data,
    isAuthenticated: !!currentUserResponse?.data,
    isLoading,
    error,
    login: login.mutate,
    logout: logout.mutate,
    register: register.mutate,
    loginState: {
      isPending: login.isPending,
      error: login.error,
    },
    registerState: {
      isPending: register.isPending,
      error: register.error,
    },
  };
}
