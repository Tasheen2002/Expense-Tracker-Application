import { PrismaClient, Prisma } from '@prisma/client';
import {
  IViolationRepository,
  ViolationFilters,
} from '../../domain/repositories/violation.repository';
import { PolicyViolation } from '../../domain/entities/policy-violation.entity';
import { ViolationId } from '../../domain/value-objects/violation-id';
import { PolicyId } from '../../domain/value-objects/policy-id';
import { WorkspaceId } from '@modules/identity-workspace/domain/value-objects/workspace-id.vo';
import { ViolationStatus } from '../../domain/enums/violation-status.enum';
import { ViolationSeverity } from '../../domain/enums/violation-severity.enum';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '@core/domain/events/domain-event';

export class PrismaViolationRepository
  extends PrismaRepository<PolicyViolation>
  implements IViolationRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(violation: PolicyViolation): Promise<void> {
    await this.prisma.policyViolation.upsert({
      where: { id: violation.id.getValue() },
      create: {
        id: violation.id.getValue(),
        workspaceId: violation.workspaceId.getValue(),
        policyId: violation.policyId.getValue(),
        expenseId: violation.expenseId,
        userId: violation.userId,
        status: violation.status,
        severity: violation.severity,
        violationDetails: violation.violationDetails,
        expenseAmount: violation.expenseAmount ?? 0,
        ...(violation.currency && { currency: violation.currency }),
        ...(violation.acknowledgedAt && { acknowledgedAt: violation.acknowledgedAt }),
        ...(violation.acknowledgedBy && { acknowledgedBy: violation.acknowledgedBy }),
        ...(violation.resolvedAt && { resolvedAt: violation.resolvedAt }),
        ...(violation.resolvedBy && { resolvedBy: violation.resolvedBy }),
        ...(violation.resolutionNotes && { resolutionNote: violation.resolutionNotes }),
      },
      update: {
        status: violation.status,
        ...(violation.acknowledgedAt && { acknowledgedAt: violation.acknowledgedAt }),
        ...(violation.acknowledgedBy && { acknowledgedBy: violation.acknowledgedBy }),
        ...(violation.resolvedAt && { resolvedAt: violation.resolvedAt }),
        ...(violation.resolvedBy && { resolvedBy: violation.resolvedBy }),
        ...(violation.resolutionNotes && { resolutionNote: violation.resolutionNotes }),
      },
    });
    await this.dispatchEvents(violation);
  }

  async findById(id: ViolationId): Promise<PolicyViolation | null> {
    const row = await this.prisma.policyViolation.findUnique({
      where: { id: id.getValue() },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByWorkspace(
    workspaceId: string,
    filters?: ViolationFilters,
    options?: PaginationOptions
  ): Promise<PaginatedResult<PolicyViolation>> {
    const where: Prisma.PolicyViolationWhereInput = { workspaceId };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.severity) {
      where.severity = filters.severity;
    }
    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.expenseId) {
      where.expenseId = filters.expenseId;
    }
    if (filters?.policyId) {
      where.policyId = filters.policyId;
    }

    return PrismaRepositoryHelper.paginate(
      this.prisma.policyViolation,
      {
        where,
        orderBy: { detectedAt: 'desc' },
      },
      (row) => this.toDomain(row),
      options
    );
  }

  async findByExpense(expenseId: string): Promise<PolicyViolation[]> {
    const rows = await this.prisma.policyViolation.findMany({
      where: { expenseId },
      orderBy: { detectedAt: 'desc' },
    });

    return rows.map((row) => this.toDomain(row));
  }

  async findByUser(
    workspaceId: string,
    userId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<PolicyViolation>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.policyViolation,
      {
        where: { workspaceId, userId },
        orderBy: { detectedAt: 'desc' },
      },
      (row) => this.toDomain(row),
      options
    );
  }

  async findPendingByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<PolicyViolation>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.policyViolation,
      {
        where: {
          workspaceId,
          status: ViolationStatus.PENDING,
        },
        orderBy: { detectedAt: 'desc' },
      },
      (row) => this.toDomain(row),
      options
    );
  }

  async countByWorkspace(
    workspaceId: string,
    filters?: ViolationFilters
  ): Promise<number> {
    const where: Prisma.PolicyViolationWhereInput = { workspaceId };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.severity) {
      where.severity = filters.severity;
    }

    return this.prisma.policyViolation.count({ where });
  }

  async deleteByExpense(expenseId: string): Promise<void> {
    await this.prisma.policyViolation.deleteMany({
      where: { expenseId },
    });
  }

  async delete(id: ViolationId): Promise<void> {
    await this.prisma.policyViolation.delete({
      where: { id: id.getValue() },
    });
  }

  private toDomain(
    row: Prisma.PolicyViolationGetPayload<object>
  ): PolicyViolation {
    return PolicyViolation.fromPersistence({
      violationId: ViolationId.fromString(row.id),
      workspaceId: WorkspaceId.fromString(row.workspaceId),
      policyId: PolicyId.fromString(row.policyId),
      expenseId: row.expenseId,
      userId: row.userId,
      status: row.status as ViolationStatus,
      severity: row.severity as ViolationSeverity,
      violationDetails: row.violationDetails,
      expenseAmount: row.expenseAmount ? Number(row.expenseAmount) : undefined,
      currency: row.currency,
      acknowledgedBy: row.acknowledgedBy ?? undefined,
      acknowledgedAt: row.acknowledgedAt ?? undefined,
      resolvedBy: row.resolvedBy ?? undefined,
      resolvedAt: row.resolvedAt ?? undefined,
      resolutionNotes: row.resolutionNote ?? undefined,
      createdAt: row.detectedAt,
      updatedAt: row.detectedAt,
    });
  }
}
