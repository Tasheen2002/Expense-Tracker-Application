/** Deployment environment wins; service-local values precede root defaults. */
export function applyEnvironmentFallback(values: Record<string, string>, environment: NodeJS.ProcessEnv = process.env): void {
  for (const [key, value] of Object.entries(values)) {
    if (environment[key] === undefined) environment[key] = value;
  }
}
