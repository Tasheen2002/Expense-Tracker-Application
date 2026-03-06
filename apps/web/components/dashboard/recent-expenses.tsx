import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

interface Expense {
  id: string;
  subject: string;
  employee: string;
  team: string;
  amount: number;
  date: string;
  status: 'submitted' | 'approved' | 'pending' | 'rejected';
}

const mockExpenses: Expense[] = [
  {
    id: '1',
    subject: 'Office Supplies',
    employee: 'John Smith',
    team: 'Marketing',
    amount: 150.0,
    date: '2024-01-15',
    status: 'approved',
  },
  {
    id: '2',
    subject: 'Business Lunch',
    employee: 'Sarah Jade',
    team: 'Sales',
    amount: 75.5,
    date: '2024-01-14',
    status: 'pending',
  },
  {
    id: '3',
    subject: 'Travel Expenses',
    employee: 'Mike Brown',
    team: 'Operations',
    amount: 450.25,
    date: '2024-01-13',
    status: 'submitted',
  },
  {
    id: '4',
    subject: 'Client Dinner',
    employee: 'Jennifer Lee',
    team: 'Marketing',
    amount: 120.0,
    date: '2024-01-12',
    status: 'approved',
  },
  {
    id: '5',
    subject: 'Hotel',
    employee: 'David Wilson',
    team: 'Finance',
    amount: 275.75,
    date: '2024-01-11',
    status: 'approved',
  },
];

const statusVariants = {
  submitted: 'default' as const,
  approved: 'success' as const,
  pending: 'warning' as const,
  rejected: 'destructive' as const,
};

const teamColors: Record<string, string> = {
  Marketing: 'bg-purple-500/10 text-purple-500',
  Sales: 'bg-red-500/10 text-red-500',
  Operations: 'bg-pink-500/10 text-pink-500',
  Finance: 'bg-cyan-500/10 text-cyan-500',
};

export function RecentExpenses() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Expenses</h2>
        <button className="text-sm text-primary hover:underline">
          View all
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="border-b text-left text-sm font-medium text-muted-foreground">
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {mockExpenses.map((expense) => (
              <tr
                key={expense.id}
                className="border-b last:border-0 transition-colors hover:bg-muted/50"
              >
                <td className="px-4 py-3 font-medium">{expense.subject}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {expense.employee}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${teamColors[expense.team] || 'bg-gray-500/10 text-gray-500'}`}
                  >
                    {expense.team}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">
                  {formatCurrency(expense.amount, 'EUR')}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariants[expense.status]}>
                    {expense.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
