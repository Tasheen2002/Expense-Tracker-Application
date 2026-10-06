import { Prisma, PrismaClient } from '@prisma/client';
import { AccountAuditLog } from '../../domain/entities/account-audit-log.entity';
import { IAccountAuditLogRepository } from '../../domain/repositories/account-audit-log.repository';
import { AuditEventConflictError } from '../../domain/errors/audit.errors';

export class AccountAuditLogRepositoryImpl implements IAccountAuditLogRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async saveIfAbsent(record: AccountAuditLog): Promise<boolean> {
    const data = record.toPersistence();
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${data.id}, 0))::text`;
      if (await tx.auditLog.findUnique({ where: { id: data.id } }))
        throw new AuditEventConflictError(data.id);
      const existing = await tx.accountAuditLog.findUnique({
        where: { id: data.id },
      });
      if (existing) {
        if (
          existing.fingerprint !== data.fingerprint ||
          existing.userId !== data.userId
        )
          throw new AuditEventConflictError(data.id);
        return false;
      }
      await tx.accountAuditLog.create({
        data: { ...data, details: data.details as Prisma.InputJsonObject },
      });
      return true;
    });
  }
  async list(userId: string, limit: number, offset: number) {
    return this.prisma.$transaction(
      async (tx) => {
        const where = { userId };
        const rows = await tx.accountAuditLog.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });
        const total = await tx.accountAuditLog.count({ where });
        return {
          items: rows.map((row) =>
            AccountAuditLog.create({
              ...row,
              details: row.details as Record<string, unknown>,
            })
          ),
          total,
          limit,
          offset,
          hasMore: offset + rows.length < total,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }
    );
  }
}
