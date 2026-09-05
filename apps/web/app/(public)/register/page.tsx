import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Register</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a new account to get started.
        </p>
      </div>
      <div className="rounded-md border bg-accent/20 p-6 text-center text-muted-foreground">
        [RegisterForm Component Placeholder]
      </div>
      <div className="text-center text-sm">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-semibold text-primary hover:underline"
        >
          Login
        </Link>
      </div>
    </div>
  );
}
