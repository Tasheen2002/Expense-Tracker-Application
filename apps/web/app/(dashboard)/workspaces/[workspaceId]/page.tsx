import { DollarSign, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/metric-card';
import { SpendingChart } from '@/components/dashboard/spending-chart';
import { CategoryChart } from '@/components/dashboard/category-chart';
import { RecentExpenses } from '@/components/dashboard/recent-expenses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function WorkspaceDashboardPage() {
  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's your expense overview.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Expenses"
          value="$2,350.00"
          change="↑ 35.4% from last month"
          changeType="negative"
          icon={DollarSign}
        />
        <MetricCard
          title="Budget Limit"
          value="$5,000.00"
          change="75%+ used"
          changeType="neutral"
          icon={TrendingUp}
        />
        <MetricCard
          title="Expenses by Category"
          value="$1,200.00"
          change="↑ 5.2%"
          changeType="positive"
          icon={Users}
        />
        <MetricCard
          title="Pending Approvals"
          value="3"
          change="↓ 1 from last week"
          changeType="positive"
          icon={AlertCircle}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Team Spending Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryChart />
          </CardContent>
        </Card>
      </div>

      {/* Recent Expenses Table */}
      <RecentExpenses />
    </div>
  );
}
