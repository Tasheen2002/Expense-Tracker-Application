import { PrismaClient } from "@prisma/client";
import {
  ExemptionRepository,
  ExemptionFilters,
} from "../../domain/repositories/exemption.repository";
import { PolicyExemption } from "../../domain/entities/policy-exemption.entity";
import { ExemptionId } from "../../domain/value-objects/exemption-id";
import { PolicyId } from "../../domain/value-objects/policy-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { ExemptionStatus } from "../../domain/enums/exemption-status.enum";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PrismaRepositoryHelper } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper";

export class PrismaExemptionRepository implements ExemptionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(exemption: PolicyExemption): Promise<void> {
    await (this.prisma as any).policyExemption.upsert({
      where: { id: exemption.getId().getValue() },
      create: {
        id: exemption.getId().getValue(),
        workspaceId: exemption.getWorkspaceId().getValue(),
        policyId: exemption.getPolicyId().getValue(),
        userId: exemption.getUserId(),
        status: exemption.getStatus(),
        reason: exemption.getReason(),
        requestedBy: exemption.getRequestedBy(),
        requestedAt: exemption.getCreatedAt(),
        validFrom: exemption.getStartDate(),
        validUntil: exemption.getEndDate(),
        approvedBy: exemption.getApprovedBy(),
        approvedAt: exemption.getApprovedAt(),
        rejectedBy: exemption.getRejectedBy(),
        rejectedAt: exemption.getRejectedAt(),
        rejectionReason: exemption.getRejectionReason(),
      },
      update: {
        status: exemption.getStatus(),
        approvedBy: exemption.getApprovedBy(),
        approvedAt: exemption.getApprovedAt(),
        rejectedBy: exemption.getRejectedBy(),
        rejectedAt: exemption.getRejectedAt(),
        rejectionReason: exemption.getRejectionReason(),
        validFrom: exemption.getStartDate(),
        validUntil: exemption.getEndDate(),
        reason: exemption.getReason(),
      },
    });
  }

  async findById(id: ExemptionId): Promise<PolicyExemption | null> {
    const row = await (this.prisma as any).policyExemption.findUnique({
      where: { id: id.getValue() },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByWorkspace(
    workspaceId: string,
    filters?: ExemptionFilters,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyExemption>> {
    const where: any = { workspaceId };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.policyId) {
      where.policyId = filters.policyId;
    }

    return PrismaRepositoryHelper.paginate(
      (this.prisma as any).policyExemption,
      {
        where,
        orderBy: { requestedAt: "desc" },
      },
      (row: any) => this.toDomain(row),
      options,
    );
  }

  async findByUser(
    workspaceId: string,
    userId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyExemption>> {
    return PrismaRepositoryHelper.paginate(
      (this.prisma as any).policyExemption,
      {
        where: { workspaceId, userId },
        orderBy: { requestedAt: "desc" },
      },
      (row: any) => this.toDomain(row),
      options,
    );
  }

  async findActiveForUser(
    workspaceId: string,
    userId: string,
    policyId: string,
  ): Promise<PolicyExemption | null> {
    const now = new Date();
    const row = await (this.prisma as any).policyExemption.findFirst({
      where: {
        workspaceId,
        userId,
        policyId,
        status: ExemptionStatus.APPROVED,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      orderBy: { validUntil: "desc" },
    });

    return row ? this.toDomain(row) : null;
  }

  async findPendingByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyExemption>> {
    return PrismaRepositoryHelper.paginate(
      (this.prisma as any).policyExemption,
      {
        where: {
          workspaceId,
          status: ExemptionStatus.PENDING,
        },
        orderBy: { requestedAt: "desc" },
      },
      (row: any) => this.toDomain(row),
      options,
    );
  }

  async countByWorkspace(
    workspaceId: string,
    filters?: ExemptionFilters,
  ): Promise<number> {
    const where: any = { workspaceId };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.userId) {
      where.userId = filters.userId;
    }

    return (this.prisma as any).policyExemption.count({ where });
  }

  async delete(id: ExemptionId): Promise<void> {
    await (this.prisma as any).policyExemption.delete({
      where: { id: id.getValue() },
    });
  }

  private toDomain(row: any): PolicyExemption {
    return PolicyExemption.reconstitute({
      exemptionId: ExemptionId.fromString(row.id),
      workspaceId: WorkspaceId.fromString(row.workspaceId),
      policyId: PolicyId.fromString(row.policyId),
      userId: row.userId,
      requestedBy: row.requestedBy,
      reason: row.reason,
      status: row.status as ExemptionStatus,
      startDate: row.validFrom,
      endDate: row.validUntil,
      approvedBy: row.approvedBy,
      approvedAt: row.approvedAt,
      rejectedBy: row.rejectedBy,
      rejectedAt: row.rejectedAt,
      rejectionReason: row.rejectionReason,
      createdAt: row.requestedAt,
      updatedAt: row.requestedAt,
    });
  }
}
