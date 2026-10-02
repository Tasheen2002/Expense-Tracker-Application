import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { buildBankFeedApp } from '../../../app';
import { HttpBankAPIClient } from '../infrastructure/bank-api/http-bank-api.client';
import { HttpExpenseReferenceChecker } from '../infrastructure/expense-reference/http-expense-reference.checker';

const bankTestDatabase = process.env.BANK_FEED_TEST_DATABASE_URL;
const expenseTestDatabase = process.env.EXPENSE_E2E_DATABASE_URL;
const enabled = Boolean(
  bankTestDatabase && bankTestDatabase === process.env.DATABASE_URL &&
  expenseTestDatabase && new URL(expenseTestDatabase).pathname.includes('_e2e_')
);

describe.skipIf(!enabled)('bank-feed to Expense service over HTTP', () => {
  const workspaceId = crypto.randomUUID();
  const otherWorkspaceId = crypto.randomUUID();
  const actorId = crypto.randomUUID();
  const authorization = 'Bearer cross-service-test';
  const bankPrisma = new PrismaClient();
  const provider = Fastify({ logger: false });
  const identity = Fastify({ logger: false });
  let bank: FastifyInstance;
  let expenseProcess: ChildProcessWithoutNullStreams;
  let expenseUrl: string;
  let priorIdentityUrl: string | undefined;

  const headers = (workspace: string) => ({
    authorization,
    'x-user-id': actorId,
    'x-user-email': 'cross-service@example.test',
    'x-workspace-id': workspace,
  });

  async function startExpenseServer(identityUrl: string): Promise<string> {
    const root = path.resolve(__dirname, '../../../../../..');
    const expenseDirectory = path.join(root, 'apps', 'expense-budgeting-service');
    expenseProcess = spawn(process.execPath, [
      path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
      path.join(expenseDirectory, 'scripts', 'cross-service-test-server.ts'),
    ], {
      cwd: expenseDirectory,
      env: {
        ...process.env,
        DATABASE_URL: expenseTestDatabase,
        IDENTITY_SERVICE_URL: identityUrl,
        NODE_ENV: 'test',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return new Promise<string>((resolve, reject) => {
      let output = '';
      let errors = '';
      const timeout = setTimeout(() => {
        expenseProcess.kill();
        reject(new Error(`Expense service did not start: ${errors}`));
      }, 20_000);
      expenseProcess.stdout.on('data', (chunk: Buffer) => {
        output += chunk.toString();
        const match = output.match(/EXPENSE_TEST_URL=(http:\/\/127\.0\.0\.1:\d+)/);
        if (match) {
          clearTimeout(timeout);
          resolve(match[1]);
        }
      });
      expenseProcess.stderr.on('data', (chunk: Buffer) => { errors += chunk.toString(); });
      expenseProcess.once('exit', (code) => {
        clearTimeout(timeout);
        reject(new Error(`Expense service exited with ${code}: ${errors}`));
      });
    });
  }

  async function createExpense(workspace: string): Promise<string> {
    const response = await fetch(`${expenseUrl}/api/v1/workspaces/${workspace}/expenses`, {
      method: 'POST',
      headers: { ...headers(workspace), 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Cross-service purchase', amount: 12.34, currency: 'USD',
        expenseDate: new Date().toISOString(), paymentMethod: 'BANK_TRANSFER',
        isReimbursable: false,
      }),
    });
    const body = await response.json() as { data?: { expenseId?: string }; message?: string };
    expect(response.status, JSON.stringify(body)).toBe(201);
    expect(body.data?.expenseId).toBeDefined();
    return body.data!.expenseId!;
  }

  async function connectAndSync(token: string): Promise<{
    connectionId: string;
    responseStatus: number;
    transactionId?: string;
  }> {
    const connected = await bank.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${workspaceId}/bank-feed-sync/connections`,
      headers: headers(workspaceId),
      payload: {
        institutionId: 'cross-service-bank', institutionName: 'Test Bank',
        accountId: crypto.randomUUID(), accountName: 'Checking',
        accountType: 'CHECKING', currency: 'USD', accessToken: token,
      },
    });
    expect(connected.statusCode, connected.body).toBe(201);
    const connectionId = connected.json().data.id as string;
    const synced = await bank.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${workspaceId}/bank-feed-sync/connections/${connectionId}/sync`,
      headers: headers(workspaceId),
      payload: {},
    });
    const transaction = await bankPrisma.bankTransaction.findFirst({
      where: { connectionId }, select: { id: true },
    });
    return { connectionId, responseStatus: synced.statusCode, transactionId: transaction?.id };
  }

  beforeAll(async () => {
    identity.get('/api/v1/workspaces/:workspaceId/members/:userId', async (request, reply) => {
      const params = request.params as { workspaceId: string; userId: string };
      if (params.userId !== actorId ||
          !new Set<string>([workspaceId, otherWorkspaceId]).has(params.workspaceId)) {
        return reply.code(404).send({ message: 'Member not found' });
      }
      return { data: { userId: actorId, workspaceId: params.workspaceId, role: 'OWNER' } };
    });
    provider.get('/transactions', async (request, reply) => {
      const token = request.headers.authorization;
      if (token === 'Bearer invalid-token') return reply.code(401).send();
      if (token === 'Bearer unavailable-token') return reply.code(503).send();
      const query = request.query as { fromDate?: string; toDate?: string };
      if (!query.fromDate || !query.toDate) return reply.code(400).send();
      return { transactions: [{
        externalId: `purchase-${token}`, amount: '12.34', currency: 'USD',
        description: 'Cross-service purchase', transactionDate: new Date().toISOString(),
      }] };
    });
    await identity.listen({ host: '127.0.0.1', port: 0 });
    await provider.listen({ host: '127.0.0.1', port: 0 });
    const identityAddress = identity.server.address();
    const providerAddress = provider.server.address();
    if (!identityAddress || typeof identityAddress === 'string' ||
        !providerAddress || typeof providerAddress === 'string') {
      throw new Error('Test HTTP servers did not bind to TCP ports');
    }
    const identityUrl = `http://127.0.0.1:${identityAddress.port}`;
    priorIdentityUrl = process.env.IDENTITY_SERVICE_URL;
    process.env.IDENTITY_SERVICE_URL = identityUrl;
    expenseUrl = await startExpenseServer(identityUrl);
    bank = await buildBankFeedApp({
      enableInternalAuth: false, logger: false,
      bankAPIClient: new HttpBankAPIClient(`http://127.0.0.1:${providerAddress.port}/transactions`),
      expenseReferenceChecker: new HttpExpenseReferenceChecker(expenseUrl),
    });
    await bank.ready();
  }, 30_000);

  afterAll(async () => {
    if (bank) await bank.close();
    if (expenseProcess) expenseProcess.kill();
    await provider.close();
    await identity.close();
    await bankPrisma.$disconnect();
    if (priorIdentityUrl === undefined) delete process.env.IDENTITY_SERVICE_URL;
    else process.env.IDENTITY_SERVICE_URL = priorIdentityUrl;
  });

  it('syncs a provider transaction and matches a real same-workspace expense', async () => {
    const expenseId = await createExpense(workspaceId);
    const result = await connectAndSync('success-token');
    expect(result.responseStatus).toBe(200);
    expect(result.transactionId).toBeDefined();
    const matched = await bank.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${workspaceId}/bank-feed-sync/transactions/${result.transactionId}/process`,
      headers: headers(workspaceId),
      payload: { action: 'match', expenseId },
    });
    expect(matched.statusCode, matched.body).toBe(200);
    const stored = await bankPrisma.bankTransaction.findUniqueOrThrow({
      where: { id: result.transactionId },
    });
    expect(stored.status).toBe('MATCHED');
    expect(stored.expenseId).toBe(expenseId);
  });

  it('rejects an expense from another workspace without changing the bank transaction', async () => {
    const foreignExpenseId = await createExpense(otherWorkspaceId);
    const result = await connectAndSync('cross-workspace-token');
    expect(result.responseStatus).toBe(200);
    const matched = await bank.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${workspaceId}/bank-feed-sync/transactions/${result.transactionId}/process`,
      headers: headers(workspaceId),
      payload: { action: 'match', expenseId: foreignExpenseId },
    });
    expect(matched.statusCode, matched.body).toBe(404);
    expect((await bankPrisma.bankTransaction.findUniqueOrThrow({
      where: { id: result.transactionId },
    })).status).toBe('PENDING');
  });

  it('fails a sync and marks its connection errored when the provider rejects its token', async () => {
    const result = await connectAndSync('invalid-token');
    expect(result.responseStatus).toBe(401);
    expect((await bankPrisma.syncSession.findFirstOrThrow({
      where: { connectionId: result.connectionId },
    })).status).toBe('FAILED');
    expect((await bankPrisma.bankConnection.findUniqueOrThrow({
      where: { id: result.connectionId },
    })).status).toBe('ERROR');
  });

  it('fails a sync but keeps its connection active on a temporary provider error', async () => {
    const result = await connectAndSync('unavailable-token');
    expect(result.responseStatus).toBe(502);
    expect((await bankPrisma.syncSession.findFirstOrThrow({
      where: { connectionId: result.connectionId },
    })).status).toBe('FAILED');
    expect((await bankPrisma.bankConnection.findUniqueOrThrow({
      where: { id: result.connectionId },
    })).status).toBe('CONNECTED');
  });
});
