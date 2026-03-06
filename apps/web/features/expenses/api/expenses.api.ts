import { api } from '@/lib/api/client';
import type {
  Expense,
  CreateExpenseDTO,
  UpdateExpenseDTO,
  Category,
  Tag,
  ApiResponse,
} from '@/types';

// ============================================================================
// Expense API Methods
// ============================================================================

export interface ListExpensesParams {
  workspaceId: string;
  page?: number;
  limit?: number;
  status?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface ListExpensesResponse {
  expenses: Expense[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const expensesApi = {
  /**
   * Create a new expense
   */
  create: async (
    workspaceId: string,
    data: CreateExpenseDTO
  ): Promise<ApiResponse<Expense>> => {
    return api.post<ApiResponse<Expense>>(
      `workspaces/${workspaceId}/expenses`,
      data
    );
  },

  /**
   * Update an existing expense
   */
  update: async (
    workspaceId: string,
    expenseId: string,
    data: UpdateExpenseDTO
  ): Promise<ApiResponse<Expense>> => {
    return api.put<ApiResponse<Expense>>(
      `workspaces/${workspaceId}/expenses/${expenseId}`,
      data
    );
  },

  /**
   * Delete an expense
   */
  delete: async (
    workspaceId: string,
    expenseId: string
  ): Promise<ApiResponse<void>> => {
    return api.delete<ApiResponse<void>>(
      `workspaces/${workspaceId}/expenses/${expenseId}`
    );
  },

  /**
   * Get a single expense by ID
   */
  getById: async (
    workspaceId: string,
    expenseId: string
  ): Promise<ApiResponse<Expense>> => {
    return api.get<ApiResponse<Expense>>(
      `workspaces/${workspaceId}/expenses/${expenseId}`
    );
  },

  /**
   * List expenses with optional filters
   */
  list: async (
    params: ListExpensesParams
  ): Promise<ApiResponse<ListExpensesResponse>> => {
    const { workspaceId, ...queryParams } = params;
    const searchParams = new URLSearchParams();

    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    const url = `workspaces/${workspaceId}/expenses${queryString ? `?${queryString}` : ''}`;

    return api.get<ApiResponse<ListExpensesResponse>>(url);
  },

  /**
   * Get all categories for a workspace
   */
  getCategories: async (
    workspaceId: string
  ): Promise<ApiResponse<Category[]>> => {
    return api.get<ApiResponse<Category[]>>(
      `workspaces/${workspaceId}/categories`
    );
  },

  /**
   * Get all tags for a workspace
   */
  getTags: async (workspaceId: string): Promise<ApiResponse<Tag[]>> => {
    return api.get<ApiResponse<Tag[]>>(`workspaces/${workspaceId}/tags`);
  },

  /**
   * Submit expense for approval
   */
  submit: async (
    workspaceId: string,
    expenseId: string
  ): Promise<ApiResponse<Expense>> => {
    return api.patch<ApiResponse<Expense>>(
      `workspaces/${workspaceId}/expenses/${expenseId}/submit`,
      {}
    );
  },
};
