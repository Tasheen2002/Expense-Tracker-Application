import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Login</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Welcome back! Sign in to your account.
        </p>
      </div>
      <div className="rounded-md border bg-accent/20 p-6 text-center text-muted-foreground">
        [LoginForm Component Placeholder]
      </div>
      <div className="text-center text-sm">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="font-semibold text-primary hover:underline"
        >
          Register
        </Link>
      </div>
    </div>
  );
}
