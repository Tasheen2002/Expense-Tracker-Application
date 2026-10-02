import { PrismaClient } from '@prisma/client';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';
import { IInventoryWriteLock } from '../../application/ports/inventory-write-lock.port';

export class PrismaInventoryWriteLock implements IInventoryWriteLock {
  constructor(private readonly prisma: PrismaClient) {}

  async acquire(workspaceId: string): Promise<void> {
    if (!PrismaUnitOfWork.isInTransaction()) {
      throw new Error('Inventory write lock requires an active transaction');
    }
    const tx = PrismaUnitOfWork.getClient(this.prisma);
    await tx.$queryRaw`
      SELECT pg_advisory_xact_lock(
        hashtext('expense-budgeting-inventory'), hashtext(${workspaceId})
      )::text AS locked
    `;
  }
}
