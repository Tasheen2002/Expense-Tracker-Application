'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { CurrentUser } from '@/types';

// ============================================================================
// Auth Context
// ============================================================================

interface AuthContextType {
  user: CurrentUser | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  login: (data: { email: string; password: string }) => void;
  logout: () => void;
  register: (data: { email: string; password: string; fullName?: string }) => void;
  loginState: {
    isPending: boolean;
    error: Error | null;
  };
  registerState: {
    isPending: boolean;
    error: Error | null;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Auth Provider Component
// ============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// useAuthContext Hook
// ============================================================================

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
}
