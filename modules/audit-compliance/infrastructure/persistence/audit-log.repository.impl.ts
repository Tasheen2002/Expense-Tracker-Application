import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaRepository } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.base";
import { IEventBus } from "../../../../apps/api/src/shared/domain/events/domain-event";
import {
  AuditLogRepository,
  AuditLogFilter,
  PaginatedAuditLogs,
} from "../../domain/repositories/audit-log.repository";
import { AuditLog } from "../../domain/entities/audit-log.entity";
import { AuditLogId } from "../../domain/value-objects/audit-log-id.vo";
import { AuditAction } from "../../domain/value-objects/audit-action.vo";
import { AuditResource } from "../../domain/value-objects/audit-resource.vo";

export class AuditLogRepositoryImpl
  extends PrismaRepository<AuditLog>
  implements AuditLogRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(auditLog: AuditLog): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        id: auditLog.id.getValue(),
        workspaceId: auditLog.workspaceId,
        userId: auditLog.userId,
        action: auditLog.action.getValue(),
        entityType: auditLog.resource.entityType,
        entityId: auditLog.resource.entityId,
        details: auditLog.details as any,
        metadata: auditLog.metadata as any,
        ipAddress: auditLog.ipAddress,
        userAgent: auditLog.userAgent,
        createdAt: auditLog.createdAt,
      },
    });
  }

  async findById(id: AuditLogId): Promise<AuditLog | null> {
    const data = await this.prisma.auditLog.findUnique({
      where: { id: id.getValue() },
    });

    return data ? this.toDomain(data) : null;
  }

  async findByWorkspace(
    workspaceId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<PaginatedAuditLogs> {
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.auditLog.count({ where: { workspaceId } }),
    ]);

    return {
      items: items.map((item) => this.toDomain(item)),
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    };
  }

  async findByFilter(filter: AuditLogFilter): Promise<PaginatedAuditLogs> {
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

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: filter.limit || 50,
        skip: filter.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toDomain(item)),
      total,
      limit: filter.limit || 50,
      offset: filter.offset || 0,
      hasMore: (filter.offset || 0) + items.length < total,
    };
  }

  async findByEntityId(
    workspaceId: string,
    entityType: string,
    entityId: string,
  ): Promise<AuditLog[]> {
    const data = await this.prisma.auditLog.findMany({
      where: {
        workspaceId,
        entityType,
        entityId,
      },
      orderBy: { createdAt: "desc" },
    });

    return data.map((item) => this.toDomain(item));
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
    endDate: Date,
  ): Promise<{ action: string; count: number }[]> {
    const result = await this.prisma.auditLog.groupBy({
      by: ["action"],
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
          action: "desc",
        },
      },
    });

    return result.map((item) => ({
      action: item.action,
      count: item._count.action,
    }));
  }

  async saveMany(auditLogs: AuditLog[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const auditLog of auditLogs) {
        await tx.auditLog.create({
          data: {
            id: auditLog.id.getValue(),
            workspaceId: auditLog.workspaceId,
            userId: auditLog.userId,
            action: auditLog.action.getValue(),
            entityType: auditLog.resource.entityType,
            entityId: auditLog.resource.entityId,
            details: auditLog.details as any,
            metadata: auditLog.metadata as any,
            ipAddress: auditLog.ipAddress,
            userAgent: auditLog.userAgent,
            createdAt: auditLog.createdAt,
          },
        });
      }
    });
  }

  async deleteOlderThan(workspaceId: string, olderThan: Date): Promise<number> {
    const result = await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.auditLog.deleteMany({
        where: {
          workspaceId,
          createdAt: {
            lt: olderThan,
          },
        },
      });
      return deleted.count;
    });
    return result;
  }

  private toDomain(data: any): AuditLog {
    return AuditLog.fromPersistence({
      id: AuditLogId.fromString(data.id),
      workspaceId: data.workspaceId,
      userId: data.userId,
      action: AuditAction.create(data.action),
      resource: AuditResource.create(data.entityType, data.entityId),
      details: data.details,
      metadata: data.metadata,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      createdAt: data.createdAt,
    });
  }
}
