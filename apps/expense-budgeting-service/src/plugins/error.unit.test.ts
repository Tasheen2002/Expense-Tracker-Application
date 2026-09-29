import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { WorkspaceAuthorizationUnavailableError } from '../modules/cost-allocation/domain/errors/cost-allocation.errors';
import errorPlugin from './error';

describe('production error responses', () => {
  it('hides 5xx messages while retaining actionable 4xx messages', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const app = Fastify({ logger: false });
    try {
      await app.register(errorPlugin);
      app.get('/unavailable', async () => {
        const error = new Error('private downstream connection details') as Error & { statusCode: number };
        error.statusCode = 503;
        throw error;
      });
      app.get('/invalid', async () => {
        const error = new Error('Invalid request') as Error & { statusCode: number };
        error.statusCode = 400;
        throw error;
      });
      app.get('/domain-unavailable', async () => {
        throw new WorkspaceAuthorizationUnavailableError();
      });

      const unavailable = await app.inject('/unavailable');
      expect(unavailable.statusCode).toBe(503);
      expect(unavailable.json().message).toBe('An unexpected error occurred');
      expect(unavailable.body).not.toContain('private downstream connection details');

      const domainUnavailable = await app.inject('/domain-unavailable');
      expect(domainUnavailable.statusCode).toBe(503);
      expect(domainUnavailable.json().code).toBe('WORKSPACE_AUTHORIZATION_UNAVAILABLE');
      expect(domainUnavailable.json().message).toBe('An unexpected error occurred');

      const invalid = await app.inject('/invalid');
      expect(invalid.statusCode).toBe(400);
      expect(invalid.json().message).toBe('Invalid request');
    } finally {
      await app.close();
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });
});
