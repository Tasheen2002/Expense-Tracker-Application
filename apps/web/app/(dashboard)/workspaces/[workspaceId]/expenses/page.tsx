'use client';

import { useState } from 'react';
import { Plus, Search, Filter, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ExpenseForm } from '@/components/expenses/expense-form';
import { formatCurrency } from '@/lib/utils';

interface Expense {
  id: string;
  date: string;
  subject: string;
  merchant: string;
  amount: number;
  currency: string;
  report: string;
  status: 'submitted' | 'approved' | 'pending' | 'not-submitted';
}

const mockExpenses: Expense[] = [
  {
    id: '1',
    date: '09/11/2022',
    subject: 'Food Catering',
    merchant: 'McFood',
    amount: 250.0,
    currency: 'EUR',
    report: 'November_2022',
    status: 'not-submitted',
  },
  {
    id: '2',
    date: '10/11/2022',
    subject: 'Office Supplies',
    merchant: 'Officio',
    amount: 150.0,
    currency: 'EUR',
    report: 'November_2022',
    status: 'not-submitted',
  },
  {
    id: '3',
    date: '11/11/2022',
    subject: 'Business Lunch',
    merchant: 'Restaurant',
    amount: 75.5,
    currency: 'EUR',
    report: 'November_2022',
    status: 'not-submitted',
  },
  {
    id: '4',
    date: '11/11/2022',
    subject: 'Travel Expenses',
    merchant: 'Airlines',
    amount: 450.25,
    currency: 'EUR',
    report: 'November_2022',
    status: 'submitted',
  },
  {
    id: '5',
    date: '12/11/2022',
    subject: 'Client Dinner',
    merchant: 'Bistro',
    amount: 120.0,
    currency: 'EUR',
    report: 'November_2022',
    status: 'not-submitted',
  },
  {
    id: '6',
    date: '14/11/2022',
    subject: 'Accommodation',
    merchant: 'Hotel ***',
    amount: 275.75,
    currency: 'EUR',
    report: 'November_2022',
    status: 'submitted',
  },
  {
    id: '7',
    date: '20/11/2022',
    subject: 'News Subscription',
    merchant: 'NewsTimes',
    amount: 30.0,
    currency: 'EUR',
    report: 'November_2022',
    status: 'not-submitted',
  },
];

const statusVariants = {
  submitted: 'default' as const,
  approved: 'success' as const,
  pending: 'warning' as const,
  'not-submitted': 'destructive' as const,
};

const statusLabels = {
  submitted: 'Submitted',
  approved: 'Approved',
  pending: 'Pending',
  'not-submitted': 'Not Submitted',
};

export default function ExpensesPage() {
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const toggleExpense = (id: string) => {
    setSelectedExpenses((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedExpenses((prev) =>
      prev.length === mockExpenses.length ? [] : mockExpenses.map((e) => e.id)
    );
  };

  const filteredExpenses = mockExpenses.filter(
    (expense) =>
      expense.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.merchant.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search expenses..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
        <Button variant="outline" className="gap-2">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="border-b text-left text-sm font-medium text-muted-foreground">
              <th className="w-12 px-4 py-3">
                <Checkbox
                  checked={selectedExpenses.length === mockExpenses.length}
                  onCheckedChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3">DETAILS</th>
              <th className="px-4 py-3">MERCHANT</th>
              <th className="px-4 py-3">AMOUNT</th>
              <th className="px-4 py-3">REPORT</th>
              <th className="px-4 py-3">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.map((expense) => (
              <tr
                key={expense.id}
                className="border-b last:border-0 transition-colors hover:bg-muted/50"
              >
                <td className="px-4 py-4">
                  <Checkbox
                    checked={selectedExpenses.includes(expense.id)}
                    onCheckedChange={() => toggleExpense(expense.id)}
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <span className="text-lg">💰</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium">{expense.date}</div>
                      <div className="font-medium">{expense.subject}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-muted-foreground">
                  {expense.merchant}
                </td>
                <td className="px-4 py-4 font-medium">
                  {formatCurrency(expense.amount, expense.currency)}
                </td>
                <td className="px-4 py-4 text-sm text-muted-foreground">
                  {expense.report}
                </td>
                <td className="px-4 py-4">
                  <Badge variant={statusVariants[expense.status]}>
                    {statusLabels[expense.status]}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredExpenses.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No expenses found
          </div>
        )}
      </div>

      {/* Expense Form Modal */}
      <ExpenseForm open={showExpenseForm} onOpenChange={setShowExpenseForm} />
    </div>
  );
}
