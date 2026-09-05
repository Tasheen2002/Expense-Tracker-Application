import Link from 'next/link';

export default function RootPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight">
          Expense Tracker
        </h1>
        <p className="text-muted-foreground">
          Manage your enterprise ledger, budgets, cost centers, and approvals in
          real-time.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-6 font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
