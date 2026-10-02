import { afterAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '../../../prisma-client';
import { buildNotificationApp } from '../../../app';
import { verifyDatabaseReadiness } from '../../../shared/infrastructure/persistence/database-readiness';

const database = process.env.NOTIFICATION_TEST_DATABASE_URL;
describe.skipIf(!database || database !== process.env.DATABASE_URL)('Notification database readiness — PostgreSQL', () => {
  const prisma = new PrismaClient();
  afterAll(async () => { await prisma.$disconnect(); });
  it('checks an actually migrated schema through the production app health route', async () => {
    vi.stubEnv('NOTIFICATION_EMAIL_PROVIDER', 'resend');
    vi.stubEnv('RESEND_API_KEY', ''); vi.stubEnv('NOTIFICATION_EMAIL_FROM', '');
    const app = await buildNotificationApp({ logger: false, enableInternalAuth: false });
    try {
      const response = await app.inject('/health');
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ database: 'connected', emailDelivery: 'paused' });
    } finally { await app.close(); vi.unstubAllEnvs(); }
  });
  it('rejects a missing concurrency column even on empty tables and rolls back the test DDL', async () => {
    await expect(prisma.$transaction(async tx => {
      await tx.$executeRaw`ALTER TABLE notification_dispatch.notifications RENAME COLUMN revision TO revision_test_missing`;
      await verifyDatabaseReadiness(tx);
    })).rejects.toThrow();
    await expect(verifyDatabaseReadiness(prisma)).resolves.toBeUndefined();
  });
});
