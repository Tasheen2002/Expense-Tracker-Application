import { rootApi } from '@expense-tracker/api-client';
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
    return rootApi.post<ApiResponse<{ userId: string; email: string }>>(
      'auth/register',
      data
    );
  },

  login: async (data: LoginDTO): Promise<ApiResponse<AuthResponse>> => {
    return rootApi.post<ApiResponse<AuthResponse>>('auth/login', data);
  },

  /**
   * Get current authenticated user
   */
  me: async (): Promise<ApiResponse<CurrentUser>> => {
    return rootApi.get<ApiResponse<CurrentUser>>('auth/me');
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
