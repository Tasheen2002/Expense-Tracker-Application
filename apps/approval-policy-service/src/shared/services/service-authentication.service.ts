import { IServiceAuthenticationPort } from '../ports/service-authentication.port';

export class DefaultServiceAuthenticationService implements IServiceAuthenticationPort {
  private readonly trustedPrincipals: Set<string>;
  private readonly serviceCredentials: Map<string, string>;

  constructor(
    customTrustedPrincipals?: string[],
    customCredentials?: Record<string, string>
  ) {
    const defaults = [
      'expense-service',
      'cron-worker',
      'approval-policy-service',
      'identity-access-service',
      'system',
      'internal-service',
    ];
    this.trustedPrincipals = new Set(
      (customTrustedPrincipals || defaults).map((p) => p.toLowerCase().trim())
    );
    this.serviceCredentials = new Map(
      Object.entries(customCredentials || {}).map(([k, v]) => [
        k.toLowerCase().trim(),
        v,
      ])
    );
  }

  isTrustedService(principal: string): boolean {
    if (!principal || typeof principal !== 'string') return false;
    return this.trustedPrincipals.has(principal.toLowerCase().trim());
  }

  async verifyService(
    principal: string,
    credentials?: { internalApiKey?: string }
  ): Promise<boolean> {
    if (!this.isTrustedService(principal)) {
      return false;
    }

    const normPrincipal = principal.toLowerCase().trim();

    // 1. Check service-bound specific credential if configured
    const boundKey =
      this.serviceCredentials.get(normPrincipal) ||
      process.env[
        `INTERNAL_KEY_${normPrincipal.replace(/-/g, '_').toUpperCase()}`
      ];
    if (boundKey) {
      return Boolean(credentials?.internalApiKey && credentials.internalApiKey === boundKey);
    }

    // 2. Validate against shared INTERNAL_API_KEY when configured
    const sharedKey = process.env.INTERNAL_API_KEY;
    if (sharedKey) {
      return Boolean(credentials?.internalApiKey && credentials.internalApiKey === sharedKey);
    }

    // 3. Fail closed unless explicit insecure internal auth is enabled in dev/test
    const allowInsecureDev =
      process.env.NODE_ENV !== 'production' &&
      process.env.ALLOW_INSECURE_INTERNAL_AUTH === 'true';

    return allowInsecureDev;
  }
}
