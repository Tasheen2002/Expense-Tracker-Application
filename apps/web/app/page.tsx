import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <span className="text-xl font-bold">Expense Tracker</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
              Manage Your Business Expenses
              <span className="text-primary"> Effortlessly</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Enterprise-grade expense tracking with automated workflows,
              real-time reporting, and seamless bank integration. Take control
              of your company spending.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/register"
                className="rounded-md bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Start Free Trial
              </Link>
              <Link
                href="#features"
                className="rounded-md border px-8 py-3 text-sm font-semibold hover:bg-accent"
              >
                Learn More
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="border-t bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything you need to track expenses
              </h2>
              <p className="mt-4 text-muted-foreground">
                Built for modern businesses with powerful features
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-lg border bg-card p-6 shadow-sm"
                >
                  <div className="mb-4 text-4xl">{feature.icon}</div>
                  <h3 className="mb-2 text-lg font-semibold">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Ready to get started?
              </h2>
              <p className="mt-4 text-muted-foreground">
                Join thousands of businesses already using Expense Tracker
              </p>
              <div className="mt-8">
                <Link
                  href="/register"
                  className="rounded-md bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Create Your Account
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              © 2024 Expense Tracker. All rights reserved.
            </p>
            <nav className="flex gap-4">
              <Link
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Terms
              </Link>
              <Link
                href="/contact"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Contact
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: '💰',
    title: 'Expense Tracking',
    description:
      'Track all expenses in real-time with automatic categorization and receipt capture.',
  },
  {
    icon: '📝',
    title: 'Receipt Vault',
    description:
      'Store and organize receipts digitally with OCR scanning and smart search.',
  },
  {
    icon: '✅',
    title: 'Approval Workflows',
    description:
      'Configure multi-level approval chains for expense authorization.',
  },
  {
    icon: '📊',
    title: 'Budget Planning',
    description:
      'Create budgets, track spending, and get alerts when limits are reached.',
  },
  {
    icon: '🏦',
    title: 'Bank Integration',
    description: 'Automatically sync transactions from your bank accounts.',
  },
  {
    icon: '📈',
    title: 'Reports & Analytics',
    description:
      'Generate detailed reports and gain insights into spending patterns.',
  },
];
