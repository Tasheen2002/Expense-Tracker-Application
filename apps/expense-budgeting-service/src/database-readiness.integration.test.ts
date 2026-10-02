import { verifyDatabaseReadiness } from './shared/infrastructure/persistence/database-readiness';
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { buildExpenseApp } from './app';

describe('expense-budgeting-service migrated schema readiness', () => {
  const prisma = new PrismaClient();
  afterAll(async () => { await prisma.$disconnect(); });
  it('checks required schema tables through the real app health endpoint', async () => {
    const app = await buildExpenseApp({ prisma, enableInternalAuth: false, logger: false });
    try {
      const response = await app.inject('/health');
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ database: 'connected', status: 'ok' });
    } finally { await app.close(); }
  });
  it('does not treat an incomplete schema as database readiness', async () => {
    const prismaInTransaction = new PrismaClient();
    try {
      await expect(prismaInTransaction.$transaction(async tx => {
        await tx.$executeRawUnsafe('ALTER TABLE inventory_management.supplier RENAME TO bootstrap_missing_table');
        // The same readiness statement must fail even though SELECT 1 succeeds.
        await tx.$queryRaw`SELECT 1`;
        await verifyDatabaseReadiness(tx);
      })).rejects.toThrow();
    } finally { await prismaInTransaction.$disconnect(); }
  });
});
