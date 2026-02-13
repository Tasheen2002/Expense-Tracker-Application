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
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (response: ApiResponse<AuthResponse>) => {
      // Store token in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth-token', response.data.token);
      }

      // Invalidate and refetch current user
      queryClient.invalidateQueries({ queryKey: authKeys.me() });

      // Redirect to workspaces (will need to select workspace)
      router.push('/workspaces');
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
