import { PrismaClient } from "@prisma/client";
import { PolicyRepository } from "../../domain/repositories/policy.repository";
import {
  ExpensePolicy,
  PolicyConfiguration,
} from "../../domain/entities/expense-policy.entity";
import { PolicyId } from "../../domain/value-objects/policy-id";
import { PolicyType } from "../../domain/enums/policy-type.enum";
import { ViolationSeverity } from "../../domain/enums/violation-severity.enum";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PrismaRepositoryHelper } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper";

export class PrismaPolicyRepository implements PolicyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(policy: ExpensePolicy): Promise<void> {
    await (this.prisma as any).expensePolicy.upsert({
      where: { id: policy.getId().getValue() },
      create: {
        id: policy.getId().getValue(),
        workspaceId: policy.getWorkspaceId().getValue(),
        name: policy.getName(),
        description: policy.getDescription(),
        policyType: policy.getPolicyType(),
        severity: policy.getSeverity(),
        configuration: policy.getConfiguration() as any,
        priority: policy.getPriority(),
        isActive: policy.isActive(),
        createdBy: policy.getCreatedBy(),
        createdAt: policy.getCreatedAt(),
        updatedAt: policy.getUpdatedAt(),
      },
      update: {
        name: policy.getName(),
        description: policy.getDescription(),
        severity: policy.getSeverity(),
        configuration: policy.getConfiguration() as any,
        priority: policy.getPriority(),
        isActive: policy.isActive(),
        updatedAt: policy.getUpdatedAt(),
      },
    });
  }

  async findById(id: PolicyId): Promise<ExpensePolicy | null> {
    const row = await (this.prisma as any).expensePolicy.findUnique({
      where: { id: id.getValue() },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ExpensePolicy>> {
    return PrismaRepositoryHelper.paginate(
      (this.prisma as any).expensePolicy,
      {
        where: { workspaceId },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      },
      (row: any) => this.toDomain(row),
      options,
    );
  }

  async findActiveByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ExpensePolicy>> {
    return PrismaRepositoryHelper.paginate(
      (this.prisma as any).expensePolicy,
      {
        where: {
          workspaceId,
          isActive: true,
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      },
      (row: any) => this.toDomain(row),
      options,
    );
  }

  async findByType(
    workspaceId: string,
    policyType: PolicyType,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ExpensePolicy>> {
    return PrismaRepositoryHelper.paginate(
      (this.prisma as any).expensePolicy,
      {
        where: {
          workspaceId,
          policyType,
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      },
      (row: any) => this.toDomain(row),
      options,
    );
  }

  async findByNameInWorkspace(
    workspaceId: string,
    name: string,
  ): Promise<ExpensePolicy | null> {
    const row = await (this.prisma as any).expensePolicy.findFirst({
      where: {
        workspaceId,
        name,
      },
    });

    return row ? this.toDomain(row) : null;
  }

  async delete(id: PolicyId): Promise<void> {
    await (this.prisma as any).expensePolicy.delete({
      where: { id: id.getValue() },
    });
  }

  private toDomain(row: any): ExpensePolicy {
    return ExpensePolicy.reconstitute({
      policyId: PolicyId.fromString(row.id),
      workspaceId: WorkspaceId.fromString(row.workspaceId),
      name: row.name,
      description: row.description,
      policyType: row.policyType as PolicyType,
      severity: row.severity as ViolationSeverity,
      configuration: row.configuration as PolicyConfiguration,
      priority: row.priority,
      isActive: row.isActive,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
