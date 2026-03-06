'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExpenseForm, ExpenseList } from '@/features/expenses';
import { useParams } from 'next/navigation';

export default function ExpensesPage() {
  const params = useParams();
  const workspaceId = params?.workspaceId as string;

  const [showExpenseForm, setShowExpenseForm] = useState(false);

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground">
            Track and manage all your expenses
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowExpenseForm(true)}>
          <Plus className="h-4 w-4" />
          New expense
        </Button>
      </div>

      {/* Expense List */}
      <ExpenseList workspaceId={workspaceId} />

      {/* Expense Form Modal */}
      <ExpenseForm
        open={showExpenseForm}
        onOpenChange={setShowExpenseForm}
        workspaceId={workspaceId}
      />
    </div>
  );
}
