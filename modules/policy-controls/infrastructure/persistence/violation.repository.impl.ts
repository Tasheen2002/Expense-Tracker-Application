import { PrismaClient } from "@prisma/client";
import {
  ViolationRepository,
  ViolationFilters,
} from "../../domain/repositories/violation.repository";
import { PolicyViolation } from "../../domain/entities/policy-violation.entity";
import { ViolationId } from "../../domain/value-objects/violation-id";
import { PolicyId } from "../../domain/value-objects/policy-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { ViolationStatus } from "../../domain/enums/violation-status.enum";
import { ViolationSeverity } from "../../domain/enums/violation-severity.enum";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PrismaRepositoryHelper } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper";

export class PrismaViolationRepository implements ViolationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(violation: PolicyViolation): Promise<void> {
    await this.prisma.policyViolation.upsert({
      where: { id: violation.getId().getValue() },
      create: {
        id: violation.getId().getValue(),
        workspaceId: violation.getWorkspaceId().getValue(),
        policyId: violation.getPolicyId().getValue(),
        expenseId: violation.getExpenseId(),
        userId: violation.getUserId(),
        status: violation.getStatus(),
        severity: violation.getSeverity(),
        violationDetails: violation.getViolationDetails(),
        expenseAmount: violation.getExpenseAmount() ?? 0,
        ...(violation.getCurrency() && { currency: violation.getCurrency() }),
        ...(violation.getAcknowledgedAt() && {
          acknowledgedAt: violation.getAcknowledgedAt(),
        }),
        ...(violation.getAcknowledgedBy() && {
          acknowledgedBy: violation.getAcknowledgedBy(),
        }),
        ...(violation.getResolvedAt() && {
          resolvedAt: violation.getResolvedAt(),
        }),
        ...(violation.getResolvedBy() && {
          resolvedBy: violation.getResolvedBy(),
        }),
        ...(violation.getResolutionNotes() && {
          resolutionNote: violation.getResolutionNotes(),
        }),
      },
      update: {
        status: violation.getStatus(),
        ...(violation.getAcknowledgedAt() && {
          acknowledgedAt: violation.getAcknowledgedAt(),
        }),
        ...(violation.getAcknowledgedBy() && {
          acknowledgedBy: violation.getAcknowledgedBy(),
        }),
        ...(violation.getResolvedAt() && {
          resolvedAt: violation.getResolvedAt(),
        }),
        ...(violation.getResolvedBy() && {
          resolvedBy: violation.getResolvedBy(),
        }),
        ...(violation.getResolutionNotes() && {
          resolutionNote: violation.getResolutionNotes(),
        }),
      },
    });
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
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyViolation>> {
    const where: any = { workspaceId };

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
        orderBy: { detectedAt: "desc" },
      },
      (row: any) => this.toDomain(row),
      options,
    );
  }

  async findByExpense(expenseId: string): Promise<PolicyViolation[]> {
    const rows = await this.prisma.policyViolation.findMany({
      where: { expenseId },
      orderBy: { detectedAt: "desc" },
    });

    return rows.map((row: any) => this.toDomain(row));
  }

  async findByUser(
    workspaceId: string,
    userId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyViolation>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.policyViolation,
      {
        where: { workspaceId, userId },
        orderBy: { detectedAt: "desc" },
      },
      (row: any) => this.toDomain(row),
      options,
    );
  }

  async findPendingByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyViolation>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.policyViolation,
      {
        where: {
          workspaceId,
          status: ViolationStatus.PENDING,
        },
        orderBy: { detectedAt: "desc" },
      },
      (row: any) => this.toDomain(row),
      options,
    );
  }

  async countByWorkspace(
    workspaceId: string,
    filters?: ViolationFilters,
  ): Promise<number> {
    const where: any = { workspaceId };

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

  private toDomain(row: any): PolicyViolation {
    return PolicyViolation.reconstitute({
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
      acknowledgedBy: row.acknowledgedBy,
      acknowledgedAt: row.acknowledgedAt,
      resolvedBy: row.resolvedBy,
      resolvedAt: row.resolvedAt,
      resolutionNotes: row.resolutionNote,
      createdAt: row.detectedAt,
      updatedAt: row.detectedAt,
    });
  }
}
