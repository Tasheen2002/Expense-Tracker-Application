'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { expensesApi, type ListExpensesParams } from '../api/expenses.api';
import type { CreateExpenseDTO, UpdateExpenseDTO } from '@/types';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// Query Keys
// ============================================================================

export const expenseKeys = {
  all: ['expenses'] as const,
  lists: () => [...expenseKeys.all, 'list'] as const,
  list: (filters: ListExpensesParams) => [...expenseKeys.lists(), filters] as const,
  details: () => [...expenseKeys.all, 'detail'] as const,
  detail: (workspaceId: string, expenseId: string) =>
    [...expenseKeys.details(), workspaceId, expenseId] as const,
  categories: (workspaceId: string) => [...expenseKeys.all, 'categories', workspaceId] as const,
  tags: (workspaceId: string) => [...expenseKeys.all, 'tags', workspaceId] as const,
};

// ============================================================================
// useExpenses - List expenses with filters
// ============================================================================

export function useExpenses(params: ListExpensesParams) {
  return useQuery({
    queryKey: expenseKeys.list(params),
    queryFn: () => expensesApi.list(params),
    enabled: !!params.workspaceId,
  });
}

// ============================================================================
// useExpense - Get single expense
// ============================================================================

export function useExpense(workspaceId: string, expenseId: string) {
  return useQuery({
    queryKey: expenseKeys.detail(workspaceId, expenseId),
    queryFn: () => expensesApi.getById(workspaceId, expenseId),
    enabled: !!workspaceId && !!expenseId,
  });
}

// ============================================================================
// useCreateExpense - Create new expense
// ============================================================================

export function useCreateExpense(workspaceId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateExpenseDTO) => expensesApi.create(workspaceId, data),
    onSuccess: () => {
      // Invalidate expenses list
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });

      toast({
        title: 'Success',
        description: 'Expense created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create expense',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// useUpdateExpense - Update existing expense
// ============================================================================

export function useUpdateExpense(workspaceId: string, expenseId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: UpdateExpenseDTO) =>
      expensesApi.update(workspaceId, expenseId, data),
    onSuccess: () => {
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: expenseKeys.detail(workspaceId, expenseId),
      });

      toast({
        title: 'Success',
        description: 'Expense updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update expense',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// useDeleteExpense - Delete expense
// ============================================================================

export function useDeleteExpense(workspaceId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (expenseId: string) => expensesApi.delete(workspaceId, expenseId),
    onSuccess: () => {
      // Invalidate expenses list
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });

      toast({
        title: 'Success',
        description: 'Expense deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete expense',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// useSubmitExpense - Submit expense for approval
// ============================================================================

export function useSubmitExpense(workspaceId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (expenseId: string) => expensesApi.submit(workspaceId, expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });

      toast({
        title: 'Success',
        description: 'Expense submitted for approval',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit expense',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// useCategories - Get workspace categories
// ============================================================================

export function useCategories(workspaceId: string) {
  return useQuery({
    queryKey: expenseKeys.categories(workspaceId),
    queryFn: () => expensesApi.getCategories(workspaceId),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// useTags - Get workspace tags
// ============================================================================

export function useTags(workspaceId: string) {
  return useQuery({
    queryKey: expenseKeys.tags(workspaceId),
    queryFn: () => expensesApi.getTags(workspaceId),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
