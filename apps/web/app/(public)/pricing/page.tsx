export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="container mx-auto px-4 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Choose the plan that works best for your business
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="rounded-lg border bg-card p-8 shadow-sm"
            >
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="mt-4 text-4xl font-bold">${plan.price}</p>
              <p className="text-muted-foreground">/month</p>
              <ul className="mt-8 space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="text-primary">✓</span>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <button className="mt-8 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Get Started
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const plans = [
  {
    name: 'Starter',
    price: 29,
    features: [
      'Up to 10 users',
      'Basic expense tracking',
      'Receipt scanning',
      'Monthly reports',
      'Email support',
    ],
  },
  {
    name: 'Professional',
    price: 79,
    features: [
      'Up to 50 users',
      'Advanced workflows',
      'Budget planning',
      'Bank integration',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    price: 199,
    features: [
      'Unlimited users',
      'Custom workflows',
      'Advanced analytics',
      'API access',
      'Dedicated support',
    ],
  },
];
