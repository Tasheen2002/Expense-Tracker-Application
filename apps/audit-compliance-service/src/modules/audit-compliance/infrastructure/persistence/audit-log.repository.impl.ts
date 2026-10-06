import { PrismaClient, Prisma } from '@prisma/client';
import {
  IAuditLogRepository,
  AuditLogFilter,
} from '../../domain/repositories/audit-log.repository';
import { AuditLog } from '../../domain/entities/audit-log.entity';
import { AuditLogId } from '../../domain/value-objects/audit-log-id.vo';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { AuditAction } from '../../domain/value-objects/audit-action.vo';
import { AuditResource } from '../../domain/value-objects/audit-resource.vo';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { isDeepStrictEqual } from 'node:util';
import { AuditEventConflictError } from '../../domain/errors/audit.errors';

export class AuditLogRepositoryImpl
  implements IAuditLogRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async save(auditLog: AuditLog): Promise<void> {
    const data = this.toPersistence(auditLog);

    await this.prisma.auditLog.create({ data });
  }

  async saveIfAbsent(auditLog: AuditLog): Promise<boolean> {
    return this.prisma.$transaction(async tx => {
    const id = auditLog.id.getValue();
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))::text`;
    if (await tx.accountAuditLog.findUnique({ where: { id } })) throw new AuditEventConflictError(id);
    const result = await tx.auditLog.createMany({
      data: [this.toPersistence(auditLog)],
      skipDuplicates: true,
    });
    if (result.count === 1) return true;

    const existing = await tx.auditLog.findUnique({ where: { id: auditLog.id.getValue() } });
    if (!existing) {
      throw new Error('Audit event could not be verified after a duplicate insert');
    }
    const eventTimestamp = auditLog.metadata?.eventTimestamp;
    const matches = existing.workspaceId === auditLog.workspaceId &&
      existing.userId === auditLog.userId &&
      existing.action === auditLog.action.getValue() &&
      existing.entityType === auditLog.resource.entityType &&
      existing.entityId === auditLog.resource.entityId &&
      isDeepStrictEqual(existing.details, auditLog.details) &&
      (typeof eventTimestamp !== 'string' || existing.createdAt.getTime() === Date.parse(eventTimestamp));
    if (!matches) throw new AuditEventConflictError(auditLog.id.getValue());
    return false;
    });
  }

  async findById(id: AuditLogId, workspaceId: string): Promise<AuditLog | null> {
    const data = await this.prisma.auditLog.findFirst({
      where: { id: id.getValue(), workspaceId },
    });

    return data ? this.toDomain(data) : null;
  }

  async findByWorkspace(
    workspaceId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<PaginatedResult<AuditLog>> {
    const where: Prisma.AuditLogWhereInput = { workspaceId };

    return PrismaRepositoryHelper.paginate(
      this.prisma.auditLog,
      { where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] },
      (record) => this.toDomain(record),
      { limit, offset }
    );
  }

  async findByFilter(
    filter: AuditLogFilter
  ): Promise<PaginatedResult<AuditLog>> {
    const where: Prisma.AuditLogWhereInput = {
      workspaceId: filter.workspaceId,
    };

    if (filter.userId) {
      where.userId = filter.userId;
    }
    if (filter.action) {
      where.action = filter.action;
    }
    if (filter.entityType) {
      where.entityType = filter.entityType;
    }
    if (filter.entityId) {
      where.entityId = filter.entityId;
    }
    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        where.createdAt.gte = filter.startDate;
      }
      if (filter.endDate) {
        where.createdAt.lte = filter.endDate;
      }
    }

    return PrismaRepositoryHelper.paginate(
      this.prisma.auditLog,
      { where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] },
      (record) => this.toDomain(record),
      { limit: filter.limit, offset: filter.offset }
    );
  }

  async findByEntityId(
    workspaceId: string,
    entityType: string,
    entityId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<AuditLog>> {
    const where: Prisma.AuditLogWhereInput = {
      workspaceId,
      entityType,
      entityId,
    };

    return PrismaRepositoryHelper.paginate(
      this.prisma.auditLog,
      { where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] },
      (record) => this.toDomain(record),
      options
    );
  }

  async countByWorkspace(workspaceId: string): Promise<number> {
    return await this.prisma.auditLog.count({
      where: { workspaceId },
    });
  }

  async countByAction(workspaceId: string, action: string): Promise<number> {
    return await this.prisma.auditLog.count({
      where: { workspaceId, action },
    });
  }

  async getActionSummary(
    workspaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ action: string; count: number }[]> {
    const result = await this.prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        workspaceId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        action: true,
      },
      orderBy: {
        _count: {
          action: 'desc',
        },
      },
    });

    return result.map((item) => ({
      action: item.action,
      count: item._count.action,
    }));
  }

  async saveMany(auditLogs: AuditLog[]): Promise<void> {
    await this.prisma.auditLog.createMany({
      data: auditLogs.map((auditLog) => this.toPersistence(auditLog)),
    });
  }

  async deleteOlderThan(workspaceId: string, olderThan: Date, purgedBy: string, requestedDays: number): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.auditLog.deleteMany({
        where: { workspaceId, createdAt: { lt: olderThan } },
      });
      if (deleted.count > 0) {
        const marker = AuditLog.create({
          workspaceId,
          userId: purgedBy,
          action: 'audit.logs_purged',
          entityType: 'Workspace',
          entityId: workspaceId,
          details: { deletedCount: deleted.count, olderThanDays: requestedDays },
          metadata: { source: 'audit-retention' },
          ipAddress: null,
          userAgent: null,
        });
        await tx.auditLog.create({ data: this.toPersistence(marker) });
      }
      return deleted.count;
    });
  }

  private toPersistence(
    auditLog: AuditLog
  ): Prisma.AuditLogUncheckedCreateInput {
    return {
      id: auditLog.id.getValue(),
      workspaceId: auditLog.workspaceId,
      userId: auditLog.userId,
      action: auditLog.action.getValue(),
      entityType: auditLog.resource.entityType,
      entityId: auditLog.resource.entityId,
      details: auditLog.details as Prisma.InputJsonValue,
      metadata: auditLog.metadata as Prisma.InputJsonValue,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      createdAt: auditLog.createdAt,
    };
  }

  private toDomain(data: Prisma.AuditLogGetPayload<object>): AuditLog {
    return AuditLog.fromPersistence({
      id: AuditLogId.fromString(data.id),
      workspaceId: data.workspaceId,
      userId: data.userId,
      action: AuditAction.fromPersistence(data.action),
      resource: AuditResource.fromPersistence(data.entityType, data.entityId),
      details: (data.details as Record<string, unknown>) || null,
      metadata: (data.metadata as Record<string, unknown>) || null,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      createdAt: data.createdAt,
    });
  }
}
