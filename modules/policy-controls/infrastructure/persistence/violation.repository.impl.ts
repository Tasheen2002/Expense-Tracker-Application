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

export class PrismaViolationRepository implements ViolationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(violation: PolicyViolation): Promise<void> {
    await (this.prisma as any).policyViolation.upsert({
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
        expenseAmount: violation.getExpenseAmount(),
        currency: violation.getCurrency(),
        acknowledgedAt: violation.getAcknowledgedAt(),
        acknowledgedBy: violation.getAcknowledgedBy(),
        resolvedAt: violation.getResolvedAt(),
        resolvedBy: violation.getResolvedBy(),
        resolutionNotes: violation.getResolutionNotes(),
        createdAt: violation.getCreatedAt(),
        updatedAt: violation.getUpdatedAt(),
      },
      update: {
        status: violation.getStatus(),
        acknowledgedAt: violation.getAcknowledgedAt(),
        acknowledgedBy: violation.getAcknowledgedBy(),
        resolvedAt: violation.getResolvedAt(),
        resolvedBy: violation.getResolvedBy(),
        resolutionNotes: violation.getResolutionNotes(),
        updatedAt: violation.getUpdatedAt(),
      },
    });
  }

  async findById(id: ViolationId): Promise<PolicyViolation | null> {
    const row = await (this.prisma as any).policyViolation.findUnique({
      where: { id: id.getValue() },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByWorkspace(
    workspaceId: string,
    filters?: ViolationFilters,
  ): Promise<PolicyViolation[]> {
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

    const rows = await (this.prisma as any).policyViolation.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row: any) => this.toDomain(row));
  }

  async findByExpense(expenseId: string): Promise<PolicyViolation[]> {
    const rows = await (this.prisma as any).policyViolation.findMany({
      where: { expenseId },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row: any) => this.toDomain(row));
  }

  async findByUser(
    workspaceId: string,
    userId: string,
  ): Promise<PolicyViolation[]> {
    const rows = await (this.prisma as any).policyViolation.findMany({
      where: { workspaceId, userId },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row: any) => this.toDomain(row));
  }

  async findPendingByWorkspace(
    workspaceId: string,
  ): Promise<PolicyViolation[]> {
    const rows = await (this.prisma as any).policyViolation.findMany({
      where: {
        workspaceId,
        status: ViolationStatus.PENDING,
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row: any) => this.toDomain(row));
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

    return (this.prisma as any).policyViolation.count({ where });
  }

  async deleteByExpense(expenseId: string): Promise<void> {
    await (this.prisma as any).policyViolation.deleteMany({
      where: { expenseId },
    });
  }

  async delete(id: ViolationId): Promise<void> {
    await (this.prisma as any).policyViolation.delete({
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
      resolutionNotes: row.resolutionNotes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
