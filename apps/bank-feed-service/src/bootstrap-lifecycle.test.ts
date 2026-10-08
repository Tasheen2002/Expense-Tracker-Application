import { EventEmitter } from 'node:events';
import Fastify, { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from './prisma-client';
import { buildBankFeedApp } from './app';
import { startBankFeedService } from './runtime';
import { applyEnvironmentFallback } from './environment';
import * as composition from './composition-root';

describe('bank-feed-service bootstrap safeguards', () => {
  const apps: FastifyInstance[] = [];
  function fixture() {
    const prisma = new PrismaClient();
    const disconnect = vi.spyOn(prisma, '$disconnect').mockResolvedValue();
    const probe = vi.spyOn(prisma, '$queryRaw').mockResolvedValue([]);
    const first = { start: vi.fn(async () => {}), stop: vi.fn(async () => {}) };
    const second = { start: vi.fn(async () => {}), stop: vi.fn(async () => {}) };
    const options = { prisma, logger: false, enableInternalAuth: false,
      workersFactory: () => [first, second], port: 0, host: '127.0.0.1' };
    return { prisma, disconnect, probe, first, second, options };
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
    await expect(buildBankFeedApp({ enableInternalAuth: false, logger: false })).rejects.toThrow('cannot be disabled');
    vi.stubEnv('INTERNAL_API_KEY', '  ');
    await expect(buildBankFeedApp({ logger: false })).rejects.toThrow('INTERNAL_API_KEY is required');
  });
  it.each(['3005abc', '', '1.5', '-1', '65536'])('rejects invalid port %s before allocating an app', async port => {
    const c = fixture(); vi.stubEnv('PORT', port);
    await expect(startBankFeedService({ ...c.options, port: undefined })).rejects.toThrow('PORT must be an integer');
    expect(c.probe).not.toHaveBeenCalled(); expect(c.disconnect).not.toHaveBeenCalled();
  });
  it('preserves empty deployment settings and service-local precedence', () => {
    const env: NodeJS.ProcessEnv = { INTERNAL_API_KEY: '', PORT: '4000' };
    applyEnvironmentFallback({ INTERNAL_API_KEY: 'local-key', PORT: '3000', DATABASE_URL: 'local' }, env);
    applyEnvironmentFallback({ DATABASE_URL: 'root', JWT_SECRET: 'root-default' }, env);
    expect(env).toEqual({ INTERNAL_API_KEY: '', PORT: '4000', DATABASE_URL: 'local', JWT_SECRET: 'root-default' });
  });
  it('starts workers after binding and handles repeated signals with one close', async () => {
    const c = fixture(); const signals = new EventEmitter();
    const options = { ...c.options, workersFactory: (app: FastifyInstance) => {
      c.first.start.mockImplementation(async () => { expect(app.server.listening).toBe(true); });
      return [c.first, c.second];
    }, installSignalHandlers: true, signalSource: signals };
    const app = await startBankFeedService(options); apps.push(app);
    expect(c.first.start).toHaveBeenCalledOnce(); expect(c.second.start).toHaveBeenCalledOnce();
    signals.emit('SIGTERM'); signals.emit('SIGINT');
    await vi.waitFor(() => expect(c.disconnect).toHaveBeenCalledOnce());
    expect(c.first.stop).toHaveBeenCalledOnce(); expect(c.second.stop).toHaveBeenCalledOnce();
    expect(signals.listenerCount('SIGTERM')).toBe(0); expect(signals.listenerCount('SIGINT')).toBe(0);
  });
  it('drains both workers before disconnecting', async () => {
    const c = fixture(); let releaseFirst!: () => void, releaseSecond!: () => void;
    c.first.stop.mockImplementation(() => new Promise<void>(resolve => { releaseFirst = resolve; }));
    c.second.stop.mockImplementation(() => new Promise<void>(resolve => { releaseSecond = resolve; }));
    const app = await startBankFeedService(c.options); apps.push(app);
    const closing = app.close(); await vi.waitFor(() => expect(c.first.stop).toHaveBeenCalledOnce());
    expect(c.second.stop).toHaveBeenCalledOnce(); expect(c.disconnect).not.toHaveBeenCalled();
    releaseFirst(); await Promise.resolve(); expect(c.disconnect).not.toHaveBeenCalled();
    releaseSecond(); await closing; expect(c.disconnect).toHaveBeenCalledOnce();
  });
  it('attempts every stop and disconnects even when one worker fails', async () => {
    const c = fixture(); const app = await startBankFeedService(c.options); apps.push(app);
    c.first.stop.mockRejectedValueOnce(new Error('Worker drain failed'));
    await expect(app.close()).rejects.toThrow('Worker drain failed');
    expect(c.second.stop).toHaveBeenCalledOnce(); expect(c.disconnect).toHaveBeenCalledOnce();
  });
  it('cleans up listener failure without starting workers', async () => {
    const blocker = Fastify(); apps.push(blocker); await blocker.listen({ port: 0, host: '127.0.0.1' });
    const address = blocker.server.address(); if (!address || typeof address === 'string') throw new Error('Expected bound port');
    const c = fixture();
    await expect(startBankFeedService({ ...c.options, port: address.port })).rejects.toMatchObject({ code: 'EADDRINUSE' });
    expect(c.first.start).not.toHaveBeenCalled(); expect(c.disconnect).toHaveBeenCalledOnce();
    expect(c.first.stop).toHaveBeenCalledOnce(); expect(c.second.stop).toHaveBeenCalledOnce();
  });
  it('cleans up partial worker startup failure', async () => {
    const c = fixture(); c.second.start.mockRejectedValueOnce(new Error('Worker startup failed'));
    await expect(startBankFeedService(c.options)).rejects.toThrow('Worker startup failed');
    expect(c.first.stop).toHaveBeenCalledOnce(); expect(c.second.stop).toHaveBeenCalledOnce();
    expect(c.disconnect).toHaveBeenCalledOnce();
  });
  it('rejects failed schema readiness without starting workers', async () => {
    const c = fixture(); c.probe.mockRejectedValueOnce(new Error('Missing schema'));
    await expect(startBankFeedService(c.options)).rejects.toThrow('Database schema is not ready');
    expect(c.first.start).not.toHaveBeenCalled(); expect(c.disconnect).toHaveBeenCalledOnce();
  });
  it('disconnects after application composition fails', async () => {
    const c = fixture();
    vi.spyOn(composition, 'createCompositionRoot').mockImplementationOnce(() => { throw new Error('Composition failed'); });
    await expect(buildBankFeedApp(c.options)).rejects.toThrow('Composition failed');
    expect(c.disconnect).toHaveBeenCalledOnce();
  });
  it('closes the app when worker construction fails', async () => {
    const c = fixture();
    await expect(startBankFeedService({ ...c.options, workersFactory: () => { throw new Error('Worker construction failed'); } })).rejects.toThrow('Worker construction failed');
    expect(c.disconnect).toHaveBeenCalledOnce();
  });
});
