import { isIP } from 'node:net';

export function gatewayNetworkConfig(options: {
  trustedProxyIPs?: string[]; rateLimitMax?: number; rateLimitWindowMs?: number;
} = {}) {
  const trustedProxyIPs = options.trustedProxyIPs ??
    (process.env.GATEWAY_TRUSTED_PROXY_IPS?.split(',').map(ip => ip.trim()).filter(Boolean) ?? []);
  if (trustedProxyIPs.some(ip => !isIP(ip) || ip === '0.0.0.0' || ip === '::')) {
    throw new Error('GATEWAY_TRUSTED_PROXY_IPS must contain explicit proxy IP addresses');
  }
  const positive = (value: number | undefined, name: string, fallback: number) => {
    const raw = process.env[name];
    if (value === undefined && raw !== undefined && !/^[1-9]\d*$/.test(raw))
      throw new Error(`${name} must be a positive safe integer`);
    const result = value ?? (raw === undefined ? fallback : Number(raw));
    if (!Number.isSafeInteger(result) || result < 1)
      throw new Error(`${name} must be a positive safe integer`);
    return result;
  };
  return {
    trustedProxyIPs,
    rateLimitMax: positive(options.rateLimitMax, 'GATEWAY_RATE_LIMIT_MAX', 300),
    rateLimitWindowMs: positive(options.rateLimitWindowMs, 'GATEWAY_RATE_LIMIT_WINDOW_MS', 60_000),
  };
}
