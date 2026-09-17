import { PrismaClient } from '@shared/infrastructure/persistence/prisma.client';
import type { Prisma } from '@prisma/client';
import {
  IExemptionRepository,
  ExemptionFilters,
} from '../../domain/repositories/exemption.repository';
import { PolicyExemption, ExemptionScope } from '../../domain/entities/policy-exemption.entity';
import { ExemptionId, PolicyId } from '../../domain/value-objects';
import { WorkspaceId, UserId } from '@core/domain/value-objects';
import { ExemptionStatus } from '../../domain/enums/exemption-status.enum';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { ExemptionAlreadyProcessedError } from '../../domain/errors/policy-controls.errors';
import { IEventBus } from '@core/domain/events/domain-event';

export class PrismaExemptionRepository
  extends PrismaRepository<PolicyExemption>
  implements IExemptionRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(exemption: PolicyExemption): Promise<void> {
    let shouldDispatch = true;
    await this.prisma.$transaction(async (tx) => {
      if (exemption.status === ExemptionStatus.EXPIRED) {
        const updateResult = await tx.policyExemption.updateMany({
          where: {
            id: exemption.id.getValue(),
            status: { in: [ExemptionStatus.APPROVED, ExemptionStatus.PENDING] },
          },
          data: {
            status: ExemptionStatus.EXPIRED,
            updatedAt: exemption.updatedAt,
          },
        });
        if (updateResult.count === 0) {
          // Already transitioned to EXPIRED by another concurrent worker; avoid duplicate outbox event
          shouldDispatch = false;
          return;
        }
      } else if (
        exemption.status === ExemptionStatus.APPROVED ||
        exemption.status === ExemptionStatus.REJECTED
      ) {
        const updateResult = await tx.policyExemption.updateMany({
          where: {
            id: exemption.id.getValue(),
            status: ExemptionStatus.PENDING,
          },
          data: {
            status: exemption.status,
            ...(exemption.approvedBy && { approvedBy: exemption.approvedBy.getValue() }),
            approvedAt: exemption.approvedAt,
            approvalNote: exemption.approvalNote,
            ...(exemption.rejectedBy && { rejectedBy: exemption.rejectedBy.getValue() }),
            rejectedAt: exemption.rejectedAt,
            rejectionReason: exemption.rejectionReason,
            validFrom: exemption.startDate,
            validUntil: exemption.endDate,
            ...(exemption.scope && { scope: exemption.scope as unknown as Prisma.InputJsonValue }),
            reason: exemption.reason,
            updatedAt: exemption.updatedAt,
          },
        });
        if (updateResult.count === 0) {
          throw new ExemptionAlreadyProcessedError(exemption.id.getValue());
        }
      } else {
        const existing = await tx.policyExemption.findUnique({
          where: { id: exemption.id.getValue() },
          select: { id: true, status: true },
        });

        if (!existing) {
          await tx.policyExemption.create({
            data: {
              id: exemption.id.getValue(),
              workspaceId: exemption.workspaceId.getValue(),
              policyId: exemption.policyId.getValue(),
              userId: exemption.userId.getValue(),
              status: exemption.status,
              reason: exemption.reason,
              requestedBy: exemption.requestedBy.getValue(),
              requestedAt: exemption.createdAt,
              validFrom: exemption.startDate,
              validUntil: exemption.endDate,
              ...(exemption.scope && { scope: exemption.scope as unknown as Prisma.InputJsonValue }),
              ...(exemption.approvedBy && { approvedBy: exemption.approvedBy.getValue() }),
              approvedAt: exemption.approvedAt,
              approvalNote: exemption.approvalNote,
              ...(exemption.rejectedBy && { rejectedBy: exemption.rejectedBy.getValue() }),
              rejectedAt: exemption.rejectedAt,
              rejectionReason: exemption.rejectionReason,
              updatedAt: exemption.updatedAt,
            },
          });
        } else {
          const updateResult = await tx.policyExemption.updateMany({
            where: {
              id: exemption.id.getValue(),
              status: ExemptionStatus.PENDING,
            },
            data: {
              status: exemption.status,
              validFrom: exemption.startDate,
              validUntil: exemption.endDate,
              ...(exemption.scope && { scope: exemption.scope as unknown as Prisma.InputJsonValue }),
              reason: exemption.reason,
              updatedAt: exemption.updatedAt,
            },
          });

          if (updateResult.count === 0) {
            throw new ExemptionAlreadyProcessedError(exemption.id.getValue());
          }
        }
      }

      await this.persistOutboxEvents(tx, exemption);
    });

    if (shouldDispatch) {
      await this.dispatchEvents(exemption);
    }
  }

  async findById(id: ExemptionId): Promise<PolicyExemption | null> {
    const row = await this.prisma.policyExemption.findUnique({
      where: { id: id.getValue() },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByWorkspace(
    workspaceId: WorkspaceId,
    filters?: ExemptionFilters,
    options?: PaginationOptions
  ): Promise<PaginatedResult<PolicyExemption>> {
    const wsId = workspaceId.getValue();
    const where: Prisma.PolicyExemptionWhereInput = { workspaceId: wsId };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.userId) {
      where.userId = typeof filters.userId === 'string' ? filters.userId : filters.userId.getValue();
    }
    if (filters?.policyId) {
      where.policyId = typeof filters.policyId === 'string' ? filters.policyId : filters.policyId.getValue();
    }
    if (filters?.startDate || filters?.endDate) {
      where.AND = [
        ...(filters.startDate ? [{ validUntil: { gte: filters.startDate } }] : []),
        ...(filters.endDate ? [{ validFrom: { lte: filters.endDate } }] : []),
      ];
    }

    return PrismaRepositoryHelper.paginate(
      this.prisma.policyExemption,
      {
        where,
        orderBy: { requestedAt: 'desc' },
      },
      (row) => this.toDomain(row),
      options
    );
  }

  async findByUser(
    workspaceId: WorkspaceId,
    userId: UserId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<PolicyExemption>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.policyExemption,
      {
        where: {
          workspaceId: workspaceId.getValue(),
          userId: userId.getValue(),
        },
        orderBy: { requestedAt: 'desc' },
      },
      (row) => this.toDomain(row),
      options
    );
  }

  async findActiveForUser(
    workspaceId: WorkspaceId,
    userId: UserId,
    policyId: PolicyId
  ): Promise<PolicyExemption | null> {
    const now = new Date();
    const row = await this.prisma.policyExemption.findFirst({
      where: {
        workspaceId: workspaceId.getValue(),
        userId: userId.getValue(),
        policyId: policyId.getValue(),
        status: ExemptionStatus.APPROVED,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      orderBy: { validUntil: 'desc' },
    });

    return row ? this.toDomain(row) : null;
  }

  async findActiveForUserPolicies(
    workspaceId: WorkspaceId,
    userId: UserId,
    policyIds: PolicyId[]
  ): Promise<Map<string, PolicyExemption>> {
    if (policyIds.length === 0) return new Map();

    const now = new Date();
    const rows = await this.prisma.policyExemption.findMany({
      where: {
        workspaceId: workspaceId.getValue(),
        userId: userId.getValue(),
        policyId: { in: policyIds.map((p) => p.getValue()) },
        status: ExemptionStatus.APPROVED,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
    });

    const result = new Map<string, PolicyExemption>();
    for (const row of rows) {
      result.set(row.policyId, this.toDomain(row));
    }
    return result;
  }

  async findPendingByWorkspace(
    workspaceId: WorkspaceId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<PolicyExemption>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.policyExemption,
      {
        where: {
          workspaceId: workspaceId.getValue(),
          status: ExemptionStatus.PENDING,
        },
        orderBy: { requestedAt: 'desc' },
      },
      (row) => this.toDomain(row),
      options
    );
  }

  async expireExpiredBatch(
    workspaceId: WorkspaceId,
    now: Date,
    limit = 100
  ): Promise<number> {
    const wsId = workspaceId.getValue();
    let expiredCount = 0;

    await this.prisma.$transaction(async (tx) => {
      const rawCandidates = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM policy_controls.policy_exemptions
        WHERE workspace_id = ${wsId}::uuid
          AND status IN ('APPROVED'::policy_controls."ExemptionStatus", 'PENDING'::policy_controls."ExemptionStatus")
          AND valid_until < ${now}
        ORDER BY valid_until ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `;
      const ids = rawCandidates.map((c) => c.id);

      if (ids.length === 0) return;

      const rows = await tx.policyExemption.findMany({
        where: { id: { in: ids } },
      });

      for (const row of rows) {
        const exemption = this.toDomain(row);
        exemption.markExpired(now);
        await tx.policyExemption.update({
          where: { id: exemption.id.getValue() },
          data: {
            status: ExemptionStatus.EXPIRED,
            updatedAt: exemption.updatedAt,
          },
        });
        await this.persistOutboxEvents(tx, exemption);
        expiredCount++;
      }
    });

    return expiredCount;
  }

  async countByWorkspace(
    workspaceId: WorkspaceId,
    filters?: ExemptionFilters
  ): Promise<number> {
    const wsId = workspaceId.getValue();
    const where: Prisma.PolicyExemptionWhereInput = { workspaceId: wsId };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.userId) {
      where.userId = typeof filters.userId === 'string' ? filters.userId : filters.userId.getValue();
    }
    if (filters?.policyId) {
      where.policyId = typeof filters.policyId === 'string' ? filters.policyId : filters.policyId.getValue();
    }
    if (filters?.startDate || filters?.endDate) {
      where.AND = [
        ...(filters.startDate ? [{ validUntil: { gte: filters.startDate } }] : []),
        ...(filters.endDate ? [{ validFrom: { lte: filters.endDate } }] : []),
      ];
    }

    return this.prisma.policyExemption.count({ where });
  }

  async delete(id: ExemptionId): Promise<void> {
    await this.prisma.policyExemption.delete({
      where: { id: id.getValue() },
    });
  }

  private toDomain(
    row: Prisma.PolicyExemptionGetPayload<object>
  ): PolicyExemption {
    return PolicyExemption.fromPersistence({
      exemptionId: ExemptionId.fromString(row.id),
      workspaceId: WorkspaceId.fromString(row.workspaceId),
      policyId: PolicyId.fromString(row.policyId),
      userId: UserId.fromString(row.userId),
      requestedBy: UserId.fromString(row.requestedBy),
      reason: row.reason,
      status: row.status as ExemptionStatus,
      startDate: row.validFrom,
      endDate: row.validUntil,
      scope: row.scope ? (row.scope as unknown as ExemptionScope) : undefined,
      approvedBy: row.approvedBy ? UserId.fromString(row.approvedBy) : undefined,
      approvedAt: row.approvedAt ?? undefined,
      approvalNote: row.approvalNote ?? undefined,
      rejectedBy: row.rejectedBy ? UserId.fromString(row.rejectedBy) : undefined,
      rejectedAt: row.rejectedAt ?? undefined,
      rejectionReason: row.rejectionReason ?? undefined,
      createdAt: row.requestedAt,
      updatedAt: row.updatedAt,
    });
  }
}
