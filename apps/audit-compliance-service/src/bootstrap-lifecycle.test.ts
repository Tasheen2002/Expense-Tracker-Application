import { EventEmitter } from 'node:events';
import Fastify, { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { buildAuditComplianceApp } from './app';
import { startAuditService } from './runtime';
import { applyEnvironmentFallback } from './environment';
import * as composition from './composition-root';

describe('audit-compliance-service bootstrap safeguards', () => {
  const apps: FastifyInstance[] = [];
  function fixture() {
    const prisma = new PrismaClient();
    const disconnect = vi.spyOn(prisma, '$disconnect').mockResolvedValue();
    const probe = vi.spyOn(prisma, '$queryRaw').mockResolvedValue([]);
    const options = { prisma, logger: false, enableInternalAuth: false,
      port: 0, host: '127.0.0.1' };
    return { prisma, disconnect, probe, options };
  }
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('JWT_SECRET', 'bootstrap-test-secret');
    vi.stubEnv('INTERNAL_API_KEY', 'test-internal-key');
  });
  afterEach(async () => {
    await Promise.allSettled(apps.splice(0).map(app => app.close()));
    vi.unstubAllEnvs(); vi.restoreAllMocks();
  });
  it('rejects production authentication bypass and missing credentials before construction', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    await expect(buildAuditComplianceApp({ enableInternalAuth: false, logger: false })).rejects.toThrow('cannot be disabled');
    vi.stubEnv('INTERNAL_API_KEY', '  ');
    await expect(buildAuditComplianceApp({ logger: false })).rejects.toThrow('INTERNAL_API_KEY is required');
  });
  it.each(['3005abc', '', '1.5', '-1', '65536'])('rejects invalid port %s before allocating an app', async port => {
    const c = fixture(); vi.stubEnv('PORT', port);
    await expect(startAuditService({ ...c.options, port: undefined })).rejects.toThrow('PORT must be an integer');
    expect(c.probe).not.toHaveBeenCalled(); expect(c.disconnect).not.toHaveBeenCalled();
  });
  it('preserves empty deployment settings and service-local precedence', () => {
    const env: NodeJS.ProcessEnv = { INTERNAL_API_KEY: '', PORT: '4000' };
    applyEnvironmentFallback({ INTERNAL_API_KEY: 'local-key', PORT: '3000', DATABASE_URL: 'local' }, env);
    applyEnvironmentFallback({ DATABASE_URL: 'root', JWT_SECRET: 'root-default' }, env);
    expect(env).toEqual({ INTERNAL_API_KEY: '', PORT: '4000', DATABASE_URL: 'local', JWT_SECRET: 'root-default' });
  });
  it('binds HTTP and handles repeated signals with one close', async () => {
    const c = fixture(); const signals = new EventEmitter();
    const app = await startAuditService({ ...c.options, installSignalHandlers: true, signalSource: signals }); apps.push(app);
    expect(app.server.listening).toBe(true);
    signals.emit('SIGTERM'); signals.emit('SIGINT');
    await vi.waitFor(() => expect(c.disconnect).toHaveBeenCalledOnce());
    expect(signals.listenerCount('SIGTERM')).toBe(0); expect(signals.listenerCount('SIGINT')).toBe(0);
  });
  it('cleans up listener failure', async () => {
    const blocker = Fastify(); apps.push(blocker); await blocker.listen({ port: 0, host: '127.0.0.1' });
    const address = blocker.server.address(); if (!address || typeof address === 'string') throw new Error('Expected bound port');
    const c = fixture();
    await expect(startAuditService({ ...c.options, port: address.port })).rejects.toMatchObject({ code: 'EADDRINUSE' });
    expect(c.disconnect).toHaveBeenCalledOnce();
  });
  it('rejects failed schema readiness', async () => {
    const c = fixture(); c.probe.mockRejectedValueOnce(new Error('Missing schema'));
    await expect(startAuditService(c.options)).rejects.toThrow('Database schema is not ready');
    expect(c.disconnect).toHaveBeenCalledOnce();
  });
  it('disconnects after application composition fails', async () => {
    const c = fixture();
    vi.spyOn(composition, 'createCompositionRoot').mockImplementationOnce(() => { throw new Error('Composition failed'); });
    await expect(buildAuditComplianceApp(c.options)).rejects.toThrow('Composition failed');
    expect(c.disconnect).toHaveBeenCalledOnce();
  });
});
