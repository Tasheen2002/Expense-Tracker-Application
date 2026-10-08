import { isIP } from 'node:net';

export function identityTrustedProxyIPs(): string[] {
  const ips = process.env.IDENTITY_TRUSTED_PROXY_IPS?.split(',').map(ip => ip.trim()).filter(Boolean) ?? [];
  if (ips.some(ip => !isIP(ip) || ip === '0.0.0.0' || ip === '::')) {
    throw new Error('IDENTITY_TRUSTED_PROXY_IPS must contain explicit proxy IP addresses');
  }
  return ips;
}

/** Deployment values, including intentional blanks, precede local defaults. */
export function applyEnvironmentFallback(values: Record<string, string>, environment: NodeJS.ProcessEnv = process.env): void {
  for (const [key, value] of Object.entries(values)) {
    if (environment[key] === undefined) environment[key] = value;
  }
}
