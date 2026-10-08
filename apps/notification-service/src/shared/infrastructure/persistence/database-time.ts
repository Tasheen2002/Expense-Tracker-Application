import type { Prisma } from '../../../prisma-client';

/** Wall-clock time after lock acquisition, not transaction-start NOW(). */
export async function databaseTime(client: Pick<Prisma.TransactionClient, '$queryRaw'>): Promise<Date> {
  const [row] = await client.$queryRaw<{ time: Date }[]>`SELECT clock_timestamp() AS time`;
  return row.time;
}
