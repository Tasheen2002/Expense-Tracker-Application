import { EventEmitter } from 'node:events';
import Fastify, { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '../../../prisma-client';
import { buildNotificationApp } from '../../../app';
import { createCompositionRoot } from '../../../composition-root';
import { startNotificationService } from '../../../runtime';
import { applyEnvironmentFallback } from '../../../environment';

describe('Notification app composition and production lifecycle', () => {
  const apps: FastifyInstance[] = [];
  function fixture() {
    const prisma = new PrismaClient();
    const disconnect = vi.spyOn(prisma, '$disconnect').mockResolvedValue();
    const probe = vi.spyOn(prisma, '$queryRaw').mockResolvedValue([]);
    const outbox = { start: vi.fn(), stop: vi.fn(async () => {}) };
    const email = { start: vi.fn(), stop: vi.fn(async () => {}) };
    const factory = vi.fn((client: PrismaClient) => Object.freeze({ ...createCompositionRoot(client),
      workers: Object.freeze({ outbox, email }) }));
    const options = { prisma, logger: false, enableInternalAuth: false, compositionRootFactory: factory };
    return { prisma, disconnect, probe, outbox, email, factory, options };
  }
  beforeEach(() => {
    vi.stubEnv('NOTIFICATION_EMAIL_PROVIDER', 'resend');
    vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('RESEND_API_KEY', ''); vi.stubEnv('NOTIFICATION_EMAIL_FROM', '');
  });
  afterEach(async () => {
    await Promise.allSettled(apps.splice(0).map(app => app.close())); vi.unstubAllEnvs();
  });

  it('freezes independent roots and shares the exact app client with its repositories', async () => {
    const a = fixture(), b = fixture();
    const first = await buildNotificationApp(a.options), second = await buildNotificationApp(b.options); apps.push(first, second);
    expect(first.prisma === a.prisma).toBe(true); expect(first.compositionRoot.prisma === a.prisma).toBe(true);
    expect(a.factory.mock.calls[0][0] === a.prisma).toBe(true);
    expect(first.compositionRoot === second.compositionRoot).toBe(false);
    expect(first.compositionRoot.notificationRepository === second.compositionRoot.notificationRepository).toBe(false);
    expect(Object.isFrozen(first.compositionRoot)).toBe(true);
    expect(Object.isFrozen(first.compositionRoot.controllers)).toBe(true);
    await first.close(); expect(a.disconnect).toHaveBeenCalledTimes(1); expect(b.disconnect).not.toHaveBeenCalled();
    expect((await second.inject('/health')).statusCode).toBe(200);
    expect(a.outbox.start).not.toHaveBeenCalled(); expect(a.email.start).not.toHaveBeenCalled();
  });

  it('returns sanitized readiness failures and checks required migrated tables/columns', async () => {
    const c = fixture(); const app = await buildNotificationApp(c.options); apps.push(app);
    const healthy = await app.inject('/health'); expect(healthy.statusCode).toBe(200);
    const sql = String(c.probe.mock.calls[0][0]);
    for (const table of ['notifications', 'notification_preferences', 'notification_templates', 'email_deliveries', 'notification_requests', 'outbox_event']) {
      expect(sql).toContain(table);
    }
    expect(sql).toContain('revision'); expect(sql).toContain('LIMIT 0');
    c.probe.mockRejectedValueOnce(new Error('private database password'));
    const failed = await app.inject('/health'); expect(failed.statusCode).toBe(503);
    expect(failed.body).not.toContain('private database password');
    expect(failed.json().error).toBe('Database service unavailable');
    expect(healthy.headers['x-content-type-options']).toBe('nosniff');
  });

  it('drains both active workers before disconnecting and closes only once', async () => {
    const c = fixture(); let releaseOutbox!: () => void, releaseEmail!: () => void;
    c.outbox.stop.mockImplementation(() => new Promise<void>(resolve => { releaseOutbox = resolve; }));
    c.email.stop.mockImplementation(() => new Promise<void>(resolve => { releaseEmail = resolve; }));
    const app = await buildNotificationApp(c.options); apps.push(app); await app.ready();
    const closing = app.close(); await vi.waitFor(() => expect(c.outbox.stop).toHaveBeenCalledTimes(1));
    expect(c.email.stop).toHaveBeenCalledTimes(1); expect(c.disconnect).not.toHaveBeenCalled();
    releaseOutbox(); await Promise.resolve(); expect(c.disconnect).not.toHaveBeenCalled();
    releaseEmail(); await closing; await app.close(); expect(c.disconnect).toHaveBeenCalledTimes(1);
  });

  it('attempts both worker stops and disconnects even when one stop fails', async () => {
    const c = fixture(); c.outbox.stop.mockRejectedValueOnce(new Error('Outbox interrupted'));
    const app = await buildNotificationApp(c.options); apps.push(app); await app.ready();
    await expect(app.close()).rejects.toThrow('Outbox interrupted');
    expect(c.email.stop).toHaveBeenCalledTimes(1); expect(c.disconnect).toHaveBeenCalledTimes(1);
  });

  it('cleans up a failed composition without starting workers', async () => {
    const c = fixture(); c.factory.mockImplementationOnce(() => { throw new Error('Invalid composition'); });
    await expect(buildNotificationApp(c.options)).rejects.toThrow('Invalid composition');
    expect(c.disconnect).toHaveBeenCalledTimes(1); expect(c.outbox.start).not.toHaveBeenCalled();
  });

  it('starts workers only after a real listener exists and removes signal handlers on close', async () => {
    const c = fixture(); const signals = new EventEmitter();
    const app = await startNotificationService({ ...c.options, port: 0, host: '127.0.0.1',
      installSignalHandlers: true, signalSource: signals }); apps.push(app);
    expect(app.server.listening).toBe(true); expect(c.outbox.start).toHaveBeenCalledTimes(1); expect(c.email.start).toHaveBeenCalledTimes(1);
    signals.emit('SIGTERM'); signals.emit('SIGINT');
    await vi.waitFor(() => expect(c.disconnect).toHaveBeenCalledTimes(1));
    expect(c.outbox.stop).toHaveBeenCalledTimes(1); expect(signals.listenerCount('SIGTERM')).toBe(0);
    expect(signals.listenerCount('SIGINT')).toBe(0);
  });

  it('cleans up listen failure without starting either worker', async () => {
    const blocker = Fastify(); apps.push(blocker); await blocker.listen({ port: 0, host: '127.0.0.1' });
    const address = blocker.server.address(); if (!address || typeof address === 'string') throw new Error('Expected bound port');
    const c = fixture();
    await expect(startNotificationService({ ...c.options, port: address.port, host: '127.0.0.1' })).rejects.toMatchObject({ code: 'EADDRINUSE' });
    expect(c.outbox.start).not.toHaveBeenCalled(); expect(c.email.start).not.toHaveBeenCalled();
    expect(c.disconnect).toHaveBeenCalledTimes(1);
  });

  it('cleans up partial worker startup failure', async () => {
    const c = fixture(); c.email.start.mockImplementation(() => { throw new Error('Email startup failed'); });
    await expect(startNotificationService({ ...c.options, port: 0, host: '127.0.0.1' })).rejects.toThrow('Email startup failed');
    expect(c.outbox.stop).toHaveBeenCalledTimes(1); expect(c.email.stop).toHaveBeenCalledTimes(1);
    expect(c.disconnect).toHaveBeenCalledTimes(1);
  });

  it('rejects schema readiness failure before listening or starting workers', async () => {
    const c = fixture(); c.probe.mockRejectedValueOnce(new Error('Migration is missing'));
    await expect(startNotificationService({ ...c.options, port: 0, host: '127.0.0.1' })).rejects.toThrow('Migration is missing');
    expect(c.outbox.start).not.toHaveBeenCalled(); expect(c.email.start).not.toHaveBeenCalled();
    expect(c.disconnect).toHaveBeenCalledTimes(1);
  });

  it('fails early on missing production authentication configuration', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('INTERNAL_API_KEY', '');
    await expect(buildNotificationApp({ logger: false })).rejects.toThrow('INTERNAL_API_KEY is required');
  });

  it('preserves deployment values and intentional blanks before service and root defaults', () => {
    const environment: NodeJS.ProcessEnv = { RESEND_API_KEY: '', PORT: '4000' };
    applyEnvironmentFallback({ RESEND_API_KEY: 'fake-local-key', PORT: '3008', DATABASE_URL: 'local-database' }, environment);
    applyEnvironmentFallback({ RESEND_API_KEY: 'fake-root-key', DATABASE_URL: 'root-database', INTERNAL_API_KEY: 'fake-key' }, environment);
    expect(environment).toEqual({ RESEND_API_KEY: '', PORT: '4000', DATABASE_URL: 'local-database', INTERNAL_API_KEY: 'fake-key' });
  });
});
