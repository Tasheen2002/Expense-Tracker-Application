import { PrismaClient } from '@prisma/client';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';
import { IWorkspaceAccountingLock } from '../../application/ports/workspace-accounting-lock.port';

export class PrismaWorkspaceAccountingLock implements IWorkspaceAccountingLock {
  constructor(private readonly prisma: PrismaClient) {}

  async acquire(workspaceId: string): Promise<void> {
    if (!PrismaUnitOfWork.isInTransaction()) {
      throw new Error('Workspace accounting lock requires a unit of work');
    }
    await PrismaUnitOfWork.getClient(this.prisma).$queryRaw`
      SELECT pg_advisory_xact_lock(hashtext('expense-budgeting-accounting'), hashtext(${workspaceId}))::text AS locked
    `;
  }
}
