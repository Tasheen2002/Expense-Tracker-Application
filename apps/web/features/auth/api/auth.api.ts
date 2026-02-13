import { api } from '@/lib/api/client';
import type {
  RegisterDTO,
  LoginDTO,
  AuthResponse,
  CurrentUser,
  ApiResponse,
} from '@/types';

// ============================================================================
// Auth API Methods
// ============================================================================

export const authApi = {
  register: async (
    data: RegisterDTO
  ): Promise<ApiResponse<{ userId: string; email: string }>> => {
    return api.post<ApiResponse<{ userId: string; email: string }>>(
      'auth/register',
      data
    );
  },

  login: async (data: LoginDTO): Promise<ApiResponse<AuthResponse>> => {
    return api.post<ApiResponse<AuthResponse>>('auth/login', data);
  },

  /**
   * Get current authenticated user
   */
  me: async (): Promise<ApiResponse<CurrentUser>> => {
    return api.get<ApiResponse<CurrentUser>>('auth/me');
  },

  /**
   * Logout (client-side token removal)
   */
  logout: async (): Promise<void> => {
    // Clear token from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-token');
    }
  },
};
