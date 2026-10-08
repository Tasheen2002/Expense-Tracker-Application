import Fastify from 'fastify';
import { afterEach, expect, it, vi } from 'vitest';
import { buildGatewayApp } from '../app';
import { gatewayNetworkConfig } from '../environment';

afterEach(() => { vi.unstubAllEnvs(); });
const base = { jwtSecret: 'gateway-network-regression-signing-secret', internalApiKey: 'gateway-network-regression-internal-secret', enableProxies: false };

it('ignores forged forwarding headers from untrusted connections', async () => {
  const app = await buildGatewayApp({ ...base, rateLimitMax: 1 });
  app.get('/probe', async request => ({ ip: request.ip, forwarded: request.headers['x-forwarded-for'], host: request.headers['x-forwarded-host'], protocol: request.headers['x-forwarded-proto'] }));
  try {
    const first = await app.inject({ url: '/probe', remoteAddress: '198.51.100.1', headers: { 'x-forwarded-for': '203.0.113.1', 'x-forwarded-host': 'attacker.test', 'x-forwarded-proto': 'https' } });
    expect(first.json()).toEqual({ ip: '198.51.100.1', forwarded: '198.51.100.1' });
    expect((await app.inject({ url: '/probe', remoteAddress: '198.51.100.1', headers: { 'x-forwarded-for': '203.0.113.2' } })).statusCode).toBe(429);
  } finally { await app.close(); }
});

it('separates clients behind an explicitly trusted proxy and stops at an untrusted hop', async () => {
  const app = await buildGatewayApp({ ...base, trustedProxyIPs: ['127.0.0.1'], rateLimitMax: 1 });
  app.get('/probe', async request => ({ ip: request.ip }));
  try {
    const probe = (ip: string) => app.inject({ url: '/probe', remoteAddress: '127.0.0.1', headers: { 'x-forwarded-for': ip } });
    expect((await probe('203.0.113.1')).statusCode).toBe(200);
    expect((await probe('203.0.113.1')).statusCode).toBe(429);
    expect((await probe('203.0.113.2')).statusCode).toBe(200);
    const response = await app.inject({ url: '/probe', remoteAddress: '127.0.0.1', headers: { 'x-forwarded-for': '192.0.2.7, 198.51.100.7' } });
    expect(response.json().ip).toBe('198.51.100.7');
    expect((await app.inject({ url: '/probe', remoteAddress: '127.0.0.1', headers: { 'x-forwarded-for': 'not-an-ip' } })).statusCode).toBe(400);
  } finally { await app.close(); }
});

it('passes a canonical client IP through the real HTTP proxy to Identity', async () => {
  const identity = Fastify({ trustProxy: ['127.0.0.1'] });
  identity.get('/api/v1/auth/probe', async request => ({ ip: request.ip, forwarded: request.headers['x-forwarded-for'] }));
  const url = await identity.listen({ host: '127.0.0.1', port: 0 });
  const gateway = await buildGatewayApp({ ...base, enableProxies: true, trustedProxyIPs: ['127.0.0.1'], services: { identity: url } });
  try {
    const response = await gateway.inject({ url: '/api/v1/auth/probe', remoteAddress: '127.0.0.1', headers: { 'x-forwarded-for': '192.0.2.7, 198.51.100.7' } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ip: '198.51.100.7', forwarded: '198.51.100.7' });
  } finally { await gateway.close(); await identity.close(); }
});

it('validates deployment settings and defaults to no trusted proxy', () => {
  expect(gatewayNetworkConfig()).toEqual({ trustedProxyIPs: [], rateLimitMax: 300, rateLimitWindowMs: 60000 });
  vi.stubEnv('GATEWAY_RATE_LIMIT_MAX', '0');
  expect(() => gatewayNetworkConfig()).toThrow('positive safe integer');
  vi.stubEnv('GATEWAY_RATE_LIMIT_MAX', '300');
  for (const value of ['true', '1', '*', '0.0.0.0/0', 'gateway.example.test']) {
    vi.stubEnv('GATEWAY_TRUSTED_PROXY_IPS', value);
    expect(() => gatewayNetworkConfig()).toThrow('explicit proxy IP addresses');
  }
});
