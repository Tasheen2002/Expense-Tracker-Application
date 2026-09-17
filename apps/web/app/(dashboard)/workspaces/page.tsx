export default function WorkspacesPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Workspaces</h1>
        <p className="text-muted-foreground">
          Select a workspace or create a new one to begin tracking expenses.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="cursor-pointer rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/50">
          <h3 className="text-lg font-semibold">Personal Workspace</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Default personal expense tracker
          </p>
          <div className="mt-4 flex items-center justify-between">
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
              Owner
            </span>
            <span className="text-sm font-semibold text-primary">
              Enter &rarr;
            </span>
          </div>
        </div>
        <div className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-6 text-center transition-colors hover:border-primary/50">
          <span className="text-sm text-muted-foreground">
            + Create Workspace
          </span>
        </div>
      </div>
    </div>
  );
}
