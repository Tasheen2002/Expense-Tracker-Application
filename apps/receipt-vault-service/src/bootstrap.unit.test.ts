import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { buildReceiptVaultApp } from './app';

describe('Receipt bootstrap and lifecycle', () => {
  it('rejects disabling internal authentication in production before creating Prisma', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('INTERNAL_API_KEY', 'test-internal-key');
    const prismaFactory = vi.fn(client);
    await expect(buildReceiptVaultApp({ enableInternalAuth: false, logger: false, prismaFactory }))
      .rejects.toThrow('Internal authentication cannot be disabled in production');
    expect(prismaFactory).not.toHaveBeenCalled();
  });
  it('rejects a whitespace-only production internal key before creating Prisma', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('INTERNAL_API_KEY', '   ');
    const prismaFactory = vi.fn(client);
    await expect(buildReceiptVaultApp({ logger: false, prismaFactory })).rejects.toThrow('INTERNAL_API_KEY is required');
    expect(prismaFactory).not.toHaveBeenCalled();
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
  function client() {
    const prisma = new PrismaClient();
    vi.spyOn(prisma, '$connect').mockResolvedValue();
    vi.spyOn(prisma, '$disconnect').mockResolvedValue();
    return prisma;
  }
  it('owns one Prisma instance and disconnects it on close', async () => {
    const prisma = client();
    vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ value: 1 }]);
    const app = await buildReceiptVaultApp({ enableInternalAuth: false, logger: false, prismaFactory: () => prisma });
    try {
      expect(app.compositionRoot.prisma).toBe(prisma);
      expect(Object.isFrozen(app.compositionRoot)).toBe(true);
      expect((await app.inject('/health')).statusCode).toBe(200);
    } finally { await app.close(); }
    expect(prisma.$connect).toHaveBeenCalledTimes(1);
    expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
  });
  it('cleans up Prisma after a failed connect', async () => {
    const prisma = client();
    vi.mocked(prisma.$connect).mockRejectedValue(new Error('offline'));
    await expect(buildReceiptVaultApp({ enableInternalAuth: false, logger: false, prismaFactory: () => prisma })).rejects.toThrow('offline');
    expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
  });
  it('sanitizes database health failures', async () => {
    const prisma = client();
    vi.spyOn(prisma, '$queryRaw').mockRejectedValue(new Error('private database credentials'));
    const app = await buildReceiptVaultApp({ enableInternalAuth: false, logger: false, prismaFactory: () => prisma });
    try { const response = await app.inject('/health'); expect(response.statusCode).toBe(503); expect(response.body).not.toContain('private database credentials'); }
    finally { await app.close(); }
  });
  it('rejects missing gateway identity before repository reads', async () => {
    const prisma = client();
    const app = await buildReceiptVaultApp({ enableInternalAuth: false, logger: false, prismaFactory: () => prisma });
    try { expect((await app.inject('/api/v1/workspaces/00000000-0000-4000-8000-000000000000/receipts')).statusCode).toBe(401); }
    finally { await app.close(); }
  });
  it('requires internal credentials in production', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('INTERNAL_API_KEY', '');
    await expect(buildReceiptVaultApp({ logger: false })).rejects.toThrow('INTERNAL_API_KEY is required');
  });
});
