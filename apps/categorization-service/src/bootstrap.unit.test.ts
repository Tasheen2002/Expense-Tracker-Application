import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { buildCategorizationApp } from './app';
import { createCompositionRoot } from './composition-root';
import { attachOutboxWorker, createShutdownHandler, readPort } from './runtime';
import { createWebhookRoutes } from './shared/infrastructure/webhooks/webhook-routing';
import { OutboxWorker } from '@expense-tracker/outbox-kit';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { CategoryRuleService } from './modules/categorization-rules/application/services/category-rule.service';
import { CategoryRuleNotFoundError } from './modules/categorization-rules/domain/errors';
import { ResponseHelper } from './shared/response.helper';
import { CommandResult } from '@core/application/command-result';

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllEnvs(); });
function client() {
  const prisma = new PrismaClient();
  vi.spyOn(prisma, '$connect').mockResolvedValue();
  vi.spyOn(prisma, '$disconnect').mockResolvedValue();
  vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ n: 1 }]);
  return prisma;
}
describe('Categorization composition and lifecycle', () => {
  it('rejects disabling internal authentication in production before creating Prisma', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('INTERNAL_API_KEY', 'test-internal-key');
    const prismaFactory = vi.fn(client);
    await expect(buildCategorizationApp({ enableInternalAuth: false, logger: false, prismaFactory }))
      .rejects.toThrow('Internal authentication cannot be disabled in production');
    expect(prismaFactory).not.toHaveBeenCalled();
  });
  it('rejects a whitespace-only production internal key before creating Prisma', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('INTERNAL_API_KEY', '   ');
    const prismaFactory = vi.fn(client);
    await expect(buildCategorizationApp({ logger: false, prismaFactory })).rejects.toThrow('INTERNAL_API_KEY is required');
    expect(prismaFactory).not.toHaveBeenCalled();
  });
  it('schedules retention cleanup without overlap and drains it before disconnecting', async () => {
    const prisma = client();
    const app = await buildCategorizationApp({ logger: false, enableInternalAuth: false, prismaFactory: () => prisma });
    const worker = new OutboxWorker(app.compositionRoot.outboxEventRepository, { publish: async () => {} });
    let finish!: (count: number) => void;
    const cleanup = vi.spyOn(worker, 'runCleanup').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    vi.useFakeTimers();
    attachOutboxWorker(app, worker, 1000);
    await vi.advanceTimersByTimeAsync(3000);
    expect(cleanup).toHaveBeenCalledOnce();
    const closing = app.close();
    await vi.advanceTimersByTimeAsync(0);
    expect(prisma.$disconnect).not.toHaveBeenCalled();
    finish(1); await closing;
    expect(prisma.$disconnect).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(3000);
    expect(cleanup).toHaveBeenCalledOnce();
  });
  it('recovers from cleanup errors on the next schedule', async () => {
    const app = await buildCategorizationApp({ logger: false, enableInternalAuth: false, prismaFactory: client });
    const worker = new OutboxWorker(app.compositionRoot.outboxEventRepository, { publish: async () => {} });
    const cleanup = vi.spyOn(worker, 'runCleanup').mockRejectedValueOnce(new Error('database unavailable')).mockResolvedValue(0);
    vi.useFakeTimers(); attachOutboxWorker(app, worker, 1000);
    await vi.advanceTimersByTimeAsync(2000);
    expect(cleanup).toHaveBeenCalledTimes(2);
    await app.close();
  });
  it('disconnects even if the initial database connection fails', async () => {
    const prisma = client();
    vi.mocked(prisma.$connect).mockRejectedValue(new Error('connect failed'));
    await expect(buildCategorizationApp({ logger: false, enableInternalAuth: false, prismaFactory: () => prisma }))
      .rejects.toThrow('connect failed');
    expect(prisma.$disconnect).toHaveBeenCalledOnce();
  });
  it('handles overlapping termination signals with one shutdown and exit', async () => {
    const prisma = client();
    const app = await buildCategorizationApp({ logger: false, enableInternalAuth: false, prismaFactory: () => prisma });
    const close = vi.spyOn(app, 'close');
    const exit = vi.fn();
    const shutdown = createShutdownHandler(app, exit);
    await Promise.all([shutdown('SIGTERM'), shutdown('SIGINT')]);
    expect(close).toHaveBeenCalledOnce();
    expect(prisma.$disconnect).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledOnce(); expect(exit).toHaveBeenCalledWith(0);
  });
  it('reports shutdown failure with a nonzero exit instead of an unhandled rejection', async () => {
    const prisma = client();
    const app = await buildCategorizationApp({ logger: false, enableInternalAuth: false, prismaFactory: () => prisma });
    vi.mocked(prisma.$disconnect).mockRejectedValue(new Error('disconnect failed'));
    const exit = vi.fn();
    await expect(createShutdownHandler(app, exit)('SIGTERM')).resolves.toBeUndefined();
    expect(exit).toHaveBeenCalledOnce(); expect(exit).toHaveBeenCalledWith(1);
  });
  it.each(['', '3004suffix', '-1', '0', '65536', '3.5', 'NaN'])('rejects invalid listening port %s', value => {
    expect(() => readPort(value)).toThrow('PORT must be an integer');
  });
  it('accepts valid ports and the default', () => {
    expect(readPort(undefined)).toBe(3004);
    expect(readPort('65535')).toBe(65535);
  });
  it('constructs frozen roots with independent clients and shares the app-owned client', async () => {
    const first = client(), second = client();
    const factory = vi.fn(createCompositionRoot);
    const app = await buildCategorizationApp({ enableInternalAuth: false, logger: false, prismaFactory: () => first, compositionRootFactory: factory });
    const other = await buildCategorizationApp({ enableInternalAuth: false, logger: false, prismaFactory: () => second });
    expect(factory).toHaveBeenCalledOnce();
    // Strict identity checks avoid recursively inspecting Prisma's cyclic proxy.
    expect(factory.mock.calls[0][0] === first).toBe(true);
    expect(app.compositionRoot.prisma === first).toBe(true); expect(other.compositionRoot.prisma === second).toBe(true);
    expect(Object.isFrozen(app.compositionRoot)).toBe(true); expect(Object.isFrozen(app.compositionRoot.categorizationRules)).toBe(true);
    await app.close(); expect(first.$disconnect).toHaveBeenCalledOnce(); expect(second.$disconnect).not.toHaveBeenCalled();
    await other.close(); expect(second.$disconnect).toHaveBeenCalledOnce();
  });
  it('drains the worker before disconnecting Prisma', async () => {
    const prisma = client(), order: string[] = [];
    vi.mocked(prisma.$disconnect).mockImplementation(async () => { order.push('db'); });
    const app = await buildCategorizationApp({ enableInternalAuth: false, logger: false, prismaFactory: () => prisma });
    const worker = new OutboxWorker(app.compositionRoot.outboxEventRepository, { publish: async () => {} });
    vi.spyOn(worker, 'stop').mockImplementation(async () => { await Promise.resolve(); order.push('worker'); });
    attachOutboxWorker(app, worker); await app.close(); expect(order).toEqual(['worker', 'db']);
  });
  it('closes the client if composition fails during startup', async () => {
    const prisma = client();
    await expect(buildCategorizationApp({ enableInternalAuth: false, logger: false, prismaFactory: () => prisma,
      compositionRootFactory: () => { throw new Error('bad wiring'); },
    })).rejects.toThrow('bad wiring');
    expect(prisma.$disconnect).toHaveBeenCalledOnce();
  });
  it('sanitizes database health and explicit 5xx errors', async () => {
    const prisma = client(); vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('INTERNAL_API_KEY', 'test-internal-key');
    const app = await buildCategorizationApp({ logger: false, prismaFactory: () => prisma });
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('private database details'));
    app.get('/test-error', async () => { throw Object.assign(new Error('private dependency details'), { statusCode: 503 }); });
    expect((await app.inject('/health')).json().error).toBe('Database service unavailable');
    const response = await app.inject({ url: '/test-error', headers: { 'x-internal-api-key': 'test-internal-key' } }); expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain('private'); await app.close();
  });
  it('routes accepted suggestions to the actual expense receiver and audit', () => {
    expect(createWebhookRoutes({ EXPENSE_SERVICE_URL: 'http://expense:3003', AUDIT_SERVICE_URL: 'http://audit:3009' }).CategorySuggestionAccepted)
      .toEqual(['http://audit:3009/api/v1/event-outbox/events', 'http://expense:3003/event-outbox/events']);
  });
});

describe('Production HTTP boundaries through the real app', () => {
  const workspaceId = randomUUID(), ruleId = randomUUID();
  const path = `/api/v1/workspaces/${workspaceId}/rules/${ruleId}`;
  const headers = () => ({ 'x-user-id': randomUUID(), 'x-internal-api-key': 'test-internal-key' });
  async function app() {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('INTERNAL_API_KEY', 'test-internal-key');
    return buildCategorizationApp({ logger: false, prismaFactory: client });
  }
  it('rejects a missing production internal key before connecting to the database', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('INTERNAL_API_KEY', '');
    const prismaFactory = vi.fn(client);
    await expect(buildCategorizationApp({ logger: false, prismaFactory })).rejects.toThrow('INTERNAL_API_KEY is required');
    expect(prismaFactory).not.toHaveBeenCalled();
  });
  it.each([undefined, 'wrong-key'])('rejects forged gateway headers without a valid internal key: %s', async key => {
    const server = await app();
    const action = vi.spyOn(server.compositionRoot.categorizationRules.categoryRuleController, 'getRuleById');
    try {
      const response = await server.inject({ url: path, headers: {
        'x-user-id': randomUUID(), ...(key ? { 'x-internal-api-key': key } : {}),
      } });
      expect(response.statusCode).toBe(403); expect(action).not.toHaveBeenCalled();
      expect((await server.inject('/health')).statusCode).toBe(200);
    } finally { await server.close(); }
  });
  it.each([
    { error: new Error('private SQL connection details'), status: 500 },
    { error: Object.assign(new Error('private upstream details'), { statusCode: 503 }), status: 503 },
    { error: new CategoryRuleNotFoundError(ruleId), status: 404 },
    { error: new Prisma.PrismaClientKnownRequestError('private missing row details', { code: 'P2025', clientVersion: 'test' }), status: 404 },
    { error: new Prisma.PrismaClientKnownRequestError('private unique constraint', { code: 'P2002', clientVersion: 'test', meta: { target: ['private_database_column'] } }), status: 409 },
  ])('translates and sanitizes controller errors with HTTP $status', async ({ error, status }) => {
    const server = await app();
    vi.spyOn(CategoryRuleService.prototype, 'getRuleById').mockRejectedValue(error);
    try {
      const response = await server.inject({ url: path, headers: headers() });
      expect(response.statusCode).toBe(status); expect(response.body).not.toContain('private');
      if (status === 404 && error instanceof CategoryRuleNotFoundError) {
        expect(response.json().code).toBe('CATEGORY_RULE_NOT_FOUND');
        expect(response.json().message).toBe(error.message);
      }
    } finally { await server.close(); }
  });
  it('sanitizes failed command results as well as thrown errors', async () => {
    const server = await app();
    server.get('/test-command-failure', async (_request, reply) =>
      ResponseHelper.fromCommand(reply, CommandResult.failure('private connection details', undefined, 503), 'unused'));
    try {
      const response = await server.inject({ url: '/test-command-failure', headers: headers() });
      expect(response.statusCode).toBe(503); expect(response.body).not.toContain('private');
    } finally { await server.close(); }
  });
  it('authenticates before counting each write once, across all three route groups', async () => {
    const server = await app(); const actorHeaders = headers(); const seenActors: string[] = [];
    vi.spyOn(server.compositionRoot.categorizationRules.categoryRuleController, 'deleteRule').mockImplementation(async (request, reply) => {
      seenActors.push(request.user.userId); return reply.code(204).send();
    });
    vi.spyOn(server.compositionRoot.categorizationRules.categorySuggestionController, 'deleteSuggestion').mockImplementation(async (request, reply) => {
      seenActors.push(request.user.userId); return reply.code(204).send();
    });
    vi.spyOn(server.compositionRoot.categorizationRules.ruleExecutionController, 'evaluateRules').mockImplementation(async (request, reply) => {
      seenActors.push(request.user.userId);
      return reply.send({ success: true, statusCode: 200, message: 'Evaluated', data: {
        appliedRule: null, suggestedCategoryId: null, execution: null, suggestion: null,
      } });
    });
    const endpoints = [
      { method: 'DELETE' as const, url: path, expected: 204 },
      { method: 'DELETE' as const, url: `/api/v1/workspaces/${workspaceId}/suggestions/${randomUUID()}`, expected: 204 },
      { method: 'POST' as const, url: `/api/v1/workspaces/${workspaceId}/evaluate`, expected: 200,
        payload: { expenseId: randomUUID(), expenseData: { amount: 1 } } },
    ];
    try {
      const unauthorized = await server.inject({ method: 'DELETE', url: path, headers: { 'x-internal-api-key': 'test-internal-key' } });
      expect(unauthorized.statusCode).toBe(401); expect(unauthorized.headers['x-ratelimit-limit']).toBeUndefined();
      for (let index = 0; index < 30; index++) {
        const endpoint = endpoints[index % endpoints.length];
        const response = await server.inject({ ...endpoint, headers: actorHeaders });
        expect(response.statusCode).toBe(endpoint.expected);
        expect(response.headers['x-ratelimit-remaining']).toBe(String(29 - index));
      }
      expect(seenActors).toEqual(Array(30).fill(actorHeaders['x-user-id']));
      const limited = await server.inject({ method: 'DELETE', url: path, headers: actorHeaders });
      expect(limited.statusCode).toBe(429); expect(seenActors).toHaveLength(30);
      const otherActor = await server.inject({ method: 'DELETE', url: path, headers: headers() });
      expect(otherActor.statusCode).toBe(204); expect(otherActor.headers['x-ratelimit-remaining']).toBe('29');
      vi.spyOn(CategoryRuleService.prototype, 'getRuleById').mockRejectedValue(new CategoryRuleNotFoundError(ruleId));
      const read = await server.inject({ url: path, headers: actorHeaders });
      expect(read.statusCode).toBe(404); expect(read.headers['x-ratelimit-remaining']).toBe('299');
    } finally { await server.close(); }
  });
  it.each([
    { name: '   ', conditionValue: 'shop' },
    { name: 'Rule', conditionValue: '   ' },
    { name: 'Rule', conditionValue: 'shop', priority: 2147483648 },
  ])('rejects invalid rule fields before invoking the controller: $name / $conditionValue / $priority', async fields => {
    const server = await app(); const create = vi.spyOn(server.compositionRoot.categorizationRules.categoryRuleController, 'createRule');
    try {
      const response = await server.inject({ method: 'POST', url: `/api/v1/workspaces/${workspaceId}/rules`, headers: headers(),
        payload: { ...fields, conditionType: 'MERCHANT_EQUALS', targetCategoryId: randomUUID() } });
      expect(response.statusCode).toBe(400); expect(create).not.toHaveBeenCalled();
    } finally { await server.close(); }
  });
});
