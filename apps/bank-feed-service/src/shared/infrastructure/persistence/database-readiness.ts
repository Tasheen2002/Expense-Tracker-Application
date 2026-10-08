import { PrismaClient } from '../../../prisma-client';

/** Resolve required schemas/tables without scanning data. */
export async function verifyDatabaseReadiness(prisma: Pick<PrismaClient, '$queryRaw'>): Promise<void> {
  await prisma.$queryRaw`SELECT 1 FROM bank_feed_sync.bank_connection c, bank_feed_sync.sync_session s, bank_feed_sync.bank_transaction t, bank_feed_sync.outbox_event o LIMIT 0`;
}
