import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildBankFeedApp } from './app';

describe('bank-feed health', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    await app?.close();
  });

  it('reports a database failure without exposing its internal error', async () => {
    app = await buildBankFeedApp({ enableInternalAuth: false, logger: false });
    vi.spyOn(app.prisma, '$queryRaw').mockRejectedValue(new Error('database password secret'));

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ status: 'degraded', database: 'disconnected' });
    expect(response.body).not.toContain('database password secret');
  });
});
