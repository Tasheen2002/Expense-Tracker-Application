import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { buildReceiptVaultApp } from '../../../app';
import { Receipt } from '../domain/entities/receipt.entity';
import { StorageLocation } from '../domain/value-objects/storage-location';

describe('Receipt authorization boundary with real route middleware', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  async function fixture(role = 'ADMIN', returnedWorkspace?: string) {
    const userId = randomUUID(), workspaceId = randomUUID();
    vi.stubEnv('INTERNAL_API_KEY', 'receipt-route-test-key');
    vi.stubEnv('IDENTITY_SERVICE_URL', 'http://identity.test');
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { userId, workspaceId: returnedWorkspace ?? workspaceId, role } }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const prisma = new PrismaClient();
    vi.spyOn(prisma, '$connect').mockResolvedValue(); vi.spyOn(prisma, '$disconnect').mockResolvedValue();
    const groupBy = vi.fn(() => { throw new Error('Unexpected repository access in authorization test'); });
    Object.defineProperty(prisma.receipt, 'groupBy', { value: groupBy, configurable: true });
    const app = await buildReceiptVaultApp({ logger: false, prismaFactory: () => prisma });
    const receipt = Receipt.create({ workspaceId, userId, fileName: 'receipt.pdf', originalName: 'receipt.pdf', filePath: 'receipt.pdf', fileSize: 20, mimeType: 'application/pdf', storageLocation: StorageLocation.createLocal('receipt.pdf') });
    const verify = vi.spyOn(app.compositionRoot.receiptService, 'verifyReceipt').mockResolvedValue(Receipt.toDTO(receipt));
    const headers = { 'x-internal-api-key': 'receipt-route-test-key', 'x-user-id': userId, authorization: 'Bearer fixture' };
    return { app, fetch, groupBy, verify, headers, userId, workspaceId, receiptId: receipt.id.getValue() };
  }
  it('rejects missing internal credentials before remote authorization or use cases', async () => {
    const f = await fixture();
    try {
      const response = await f.app.inject({ url: `/api/v1/workspaces/${f.workspaceId}/receipts/stats`, headers: { 'x-user-id': f.userId } });
      expect(response.statusCode).toBe(403); expect(f.fetch).not.toHaveBeenCalled(); expect(f.groupBy).not.toHaveBeenCalled();
    } finally { await f.app.close(); }
  });
  it.each(['MEMBER', 'VIEWER'])('rejects %s verification before the application use case', async role => {
    const f = await fixture(role);
    try {
      const response = await f.app.inject({ method: 'POST', url: `/api/v1/workspaces/${f.workspaceId}/receipts/${f.receiptId}/verify`, headers: f.headers });
      expect(response.statusCode).toBe(403); expect(f.verify).not.toHaveBeenCalled(); expect(f.fetch).toHaveBeenCalledOnce();
    } finally { await f.app.close(); }
  });
  it('passes trusted administrator and workspace IDs after one remote authorization check', async () => {
    const f = await fixture();
    try {
      const response = await f.app.inject({ method: 'POST', url: `/api/v1/workspaces/${f.workspaceId}/receipts/${f.receiptId}/verify`, headers: f.headers });
      expect(response.statusCode).toBe(200); expect(f.verify).toHaveBeenCalledWith(f.receiptId, f.workspaceId, f.userId); expect(f.fetch).toHaveBeenCalledOnce();
    } finally { await f.app.close(); }
  });
  it('rejects workspace mismatches before repository reads', async () => {
    const f = await fixture('ADMIN', randomUUID());
    try {
      const response = await f.app.inject({ url: `/api/v1/workspaces/${f.workspaceId}/receipts/stats`, headers: f.headers });
      expect(response.statusCode).toBe(403); expect(f.groupBy).not.toHaveBeenCalled();
    } finally { await f.app.close(); }
  });
  it('fails closed when membership lookup denies access', async () => {
    const f = await fixture(); f.fetch.mockResolvedValue(new Response('{}', { status: 404 }));
    try {
      const response = await f.app.inject({ url: `/api/v1/workspaces/${f.workspaceId}/receipts/stats`, headers: f.headers });
      expect(response.statusCode).toBe(403); expect(f.groupBy).not.toHaveBeenCalled();
    } finally { await f.app.close(); }
  });
});
