'use client';

import { useState } from 'react';
import { MoreVertical, Pencil, Trash2, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useExpenses, useDeleteExpense, useSubmitExpense } from '../hooks/useExpenses';
import type { Expense } from '@/types';
import { ExpenseForm } from './ExpenseForm';

interface ExpenseListProps {
  workspaceId: string;
  page?: number;
  limit?: number;
  categoryId?: string;
  status?: string;
}

const statusVariants: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  DRAFT: 'secondary',
  SUBMITTED: 'default',
  APPROVED: 'success',
  PENDING_APPROVAL: 'warning',
  REJECTED: 'destructive',
  REIMBURSED: 'success',
};

export function ExpenseList({
  workspaceId,
  page = 1,
  limit = 10,
  categoryId,
  status,
}: ExpenseListProps) {
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: response, isLoading, error } = useExpenses({
    workspaceId,
    page,
    limit,
    categoryId,
    status,
  });

  const deleteExpense = useDeleteExpense(workspaceId);
  const submitExpense = useSubmitExpense(workspaceId);

  const expenses = response?.data?.expenses || [];
  const total = response?.data?.total || 0;

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deletingExpenseId) {
      await deleteExpense.mutateAsync(deletingExpenseId);
      setDeletingExpenseId(null);
    }
  };

  const handleSubmit = async (expenseId: string) => {
    await submitExpense.mutateAsync(expenseId);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingExpense(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Loading expenses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-red-500">
            {error instanceof Error ? error.message : 'Failed to load expenses'}
          </p>
        </div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground">No expenses found</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Expenses ({total})
          </h2>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                <th className="px-4 py-3">Merchant</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr
                  key={expense.id}
                  className="border-b last:border-0 transition-colors hover:bg-muted/50"
                >
                  <td className="px-4 py-3 font-medium">{expense.merchant || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
                    {expense.description || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatDate(expense.expenseDate)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatCurrency(parseFloat(expense.amount), expense.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariants[expense.status] || 'default'}>
                      {expense.status.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(expense)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        {expense.status === 'DRAFT' && (
                          <DropdownMenuItem onClick={() => handleSubmit(expense.id)}>
                            <Send className="mr-2 h-4 w-4" />
                            Submit for approval
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => setDeletingExpenseId(expense.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Form */}
      {editingExpense && (
        <ExpenseForm
          open={isFormOpen}
          onOpenChange={handleFormClose}
          workspaceId={workspaceId}
          expense={editingExpense}
          mode="edit"
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingExpenseId}
        onOpenChange={() => setDeletingExpenseId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the expense.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteExpense.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
