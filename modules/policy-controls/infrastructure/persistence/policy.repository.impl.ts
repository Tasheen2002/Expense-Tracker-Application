import { PrismaClient, Prisma } from '@prisma/client';
import { IPolicyRepository } from '../../domain/repositories/policy.repository';
import {
  ExpensePolicy,
  PolicyConfiguration,
} from '../../domain/entities/expense-policy.entity';
import { PolicyId } from '../../domain/value-objects/policy-id';
import { PolicyType } from '../../domain/enums/policy-type.enum';
import { ViolationSeverity } from '../../domain/enums/violation-severity.enum';
import { WorkspaceId } from '@modules/identity-workspace/domain/value-objects/workspace-id.vo';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '@core/domain/events/domain-event';

export class PrismaPolicyRepository
  extends PrismaRepository<ExpensePolicy>
  implements IPolicyRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(policy: ExpensePolicy): Promise<void> {
    await this.prisma.expensePolicy.upsert({
      where: { id: policy.id.getValue() },
      create: {
        id: policy.id.getValue(),
        workspaceId: policy.workspaceId.getValue(),
        name: policy.name,
        description: policy.description,
        policyType: policy.policyType,
        severity: policy.severity,
        configuration: policy.configuration as Prisma.InputJsonValue,
        priority: policy.priority,
        isActive: policy.isActive,
        createdBy: policy.createdBy,
        createdAt: policy.createdAt,
        updatedAt: policy.updatedAt,
      },
      update: {
        name: policy.name,
        description: policy.description,
        severity: policy.severity,
        configuration: policy.configuration as Prisma.InputJsonValue,
        priority: policy.priority,
        isActive: policy.isActive,
        updatedAt: policy.updatedAt,
      },
    });
    await this.dispatchEvents(policy);
  }

  async findById(id: PolicyId): Promise<ExpensePolicy | null> {
    const row = await this.prisma.expensePolicy.findUnique({
      where: { id: id.getValue() },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpensePolicy>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.expensePolicy,
      {
        where: { workspaceId },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      },
      (row) => this.toDomain(row as Prisma.ExpensePolicyGetPayload<object>),
      options
    );
  }

  async findActiveByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpensePolicy>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.expensePolicy,
      {
        where: {
          workspaceId,
          isActive: true,
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      },
      (row) => this.toDomain(row as Prisma.ExpensePolicyGetPayload<object>),
      options
    );
  }

  async findByType(
    workspaceId: string,
    policyType: PolicyType,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpensePolicy>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.expensePolicy,
      {
        where: {
          workspaceId,
          policyType,
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      },
      (row) => this.toDomain(row as Prisma.ExpensePolicyGetPayload<object>),
      options
    );
  }

  async findByNameInWorkspace(
    workspaceId: string,
    name: string
  ): Promise<ExpensePolicy | null> {
    const row = await this.prisma.expensePolicy.findFirst({
      where: {
        workspaceId,
        name,
      },
    });

    return row ? this.toDomain(row) : null;
  }

  async delete(id: PolicyId): Promise<void> {
    await this.prisma.expensePolicy.delete({
      where: { id: id.getValue() },
    });
  }

  private toDomain(row: Prisma.ExpensePolicyGetPayload<object>): ExpensePolicy {
    return ExpensePolicy.fromPersistence({
      policyId: PolicyId.fromString(row.id),
      workspaceId: WorkspaceId.fromString(row.workspaceId),
      name: row.name,
      description: row.description ?? undefined,
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
