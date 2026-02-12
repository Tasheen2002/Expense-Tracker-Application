import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaRepository } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.base";
import { IEventBus } from "../../../../apps/api/src/shared/domain/events/domain-event";
import {
  AuditLogRepository,
  AuditLogFilter,
} from "../../domain/repositories/audit-log.repository";
import { AuditLog } from "../../domain/entities/audit-log.entity";
import { AuditLogId } from "../../domain/value-objects/audit-log-id.vo";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { AuditAction } from "../../domain/value-objects/audit-action.vo";
import { AuditResource } from "../../domain/value-objects/audit-resource.vo";
import { PrismaRepositoryHelper } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper";

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
        details: auditLog.details as Prisma.InputJsonValue,
        metadata: auditLog.metadata as Prisma.InputJsonValue,
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
  ): Promise<PaginatedResult<AuditLog>> {
    const where: Prisma.AuditLogWhereInput = { workspaceId };

    return PrismaRepositoryHelper.paginate(
      this.prisma.auditLog,
      { where, orderBy: { createdAt: "desc" } },
      (record) => this.toDomain(record),
      { limit, offset },
    );
  }

  async findByFilter(
    filter: AuditLogFilter,
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
      { where, orderBy: { createdAt: "desc" } },
      (record) => this.toDomain(record),
      { limit: filter.limit, offset: filter.offset },
    );
  }

  async findByEntityId(
    workspaceId: string,
    entityType: string,
    entityId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<AuditLog>> {
    const where: Prisma.AuditLogWhereInput = {
      workspaceId,
      entityType,
      entityId,
    };

    return PrismaRepositoryHelper.paginate(
      this.prisma.auditLog,
      { where, orderBy: { createdAt: "desc" } },
      (record) => this.toDomain(record),
      options,
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
    await this.prisma.auditLog.createMany({
      data: auditLogs.map((auditLog) => ({
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
      })),
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

  private toDomain(data: Prisma.AuditLogGetPayload<object>): AuditLog {
    return AuditLog.fromPersistence({
      id: AuditLogId.fromString(data.id),
      workspaceId: data.workspaceId,
      userId: data.userId,
      action: AuditAction.create(data.action),
      resource: AuditResource.create(data.entityType, data.entityId),
      details: (data.details as Record<string, unknown>) || null,
      metadata: (data.metadata as Record<string, unknown>) || null,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      createdAt: data.createdAt,
    });
  }
}
