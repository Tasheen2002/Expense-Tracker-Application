import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar Navigation */}
      <aside className="flex w-64 flex-col justify-between border-r border-border bg-card p-6">
        <div className="space-y-6">
          <div className="text-xl font-bold tracking-tight">
            Expense Tracker
          </div>
          <nav className="space-y-1">
            <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Workspace
            </div>
            <div className="flex h-10 items-center rounded-md bg-accent px-3 font-medium text-accent-foreground">
              Dashboard
            </div>
          </nav>
        </div>
        <div className="text-sm text-muted-foreground">
          [User Profile Placeholder]
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-8">
          <div className="text-lg font-semibold">[Workspace Name]</div>
          <div>[Notifications Bell]</div>
        </header>
        <main className="flex-1 bg-slate-50/50 p-8 dark:bg-slate-900/50">
          {children}
        </main>
      </div>
    </div>
  );
}
