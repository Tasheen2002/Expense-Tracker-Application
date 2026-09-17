import { PrismaClient, PrismaClientKnownRequestError } from '@shared/infrastructure/persistence/prisma.client';
import type { Prisma } from '@prisma/client';
import { IPolicyRepository } from '../../domain/repositories/policy.repository';
import {
  ExpensePolicy,
  PolicyConfiguration,
} from '../../domain/entities/expense-policy.entity';
import { PolicyId } from '../../domain/value-objects';
import { PolicyType } from '../../domain/enums/policy-type.enum';
import { ViolationSeverity } from '../../domain/enums/violation-severity.enum';
import { PolicyNameAlreadyExistsError } from '../../domain/errors/policy-controls.errors';
import { WorkspaceId, UserId } from '@core/domain/value-objects';
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
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.expensePolicy.upsert({
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
            createdBy: policy.createdBy.getValue(),
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

        await this.persistOutboxEvents(tx, policy);
      });
    } catch (error: unknown) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target;
          const constraint = error.meta?.constraint;
          const message = error.message;

          const isNameConflict =
            (Array.isArray(target) && target.some((t: unknown) => String(t).toLowerCase().includes('name'))) ||
            (typeof target === 'string' && target.toLowerCase().includes('name')) ||
            (typeof constraint === 'string' && constraint.toLowerCase().includes('name')) ||
            message.toLowerCase().includes('name');

          if (isNameConflict) {
            throw new PolicyNameAlreadyExistsError(policy.name, policy.workspaceId.getValue());
          }
        }
      } else if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
      ) {
        const meta = (error as { meta?: { target?: unknown; constraint?: unknown } }).meta;
        const target = meta?.target;
        const constraint = meta?.constraint;
        const message = error instanceof Error ? error.message : '';

        const isNameConflict =
          (Array.isArray(target) && target.some((t: unknown) => String(t).toLowerCase().includes('name'))) ||
          (typeof target === 'string' && target.toLowerCase().includes('name')) ||
          (typeof constraint === 'string' && constraint.toLowerCase().includes('name')) ||
          message.toLowerCase().includes('name');

        if (isNameConflict) {
          throw new PolicyNameAlreadyExistsError(policy.name, policy.workspaceId.getValue());
        }
      }

      throw error;
    }

    await this.dispatchEvents(policy);
  }

  async findById(id: PolicyId): Promise<ExpensePolicy | null> {
    const row = await this.prisma.expensePolicy.findUnique({
      where: { id: id.getValue() },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByWorkspace(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
    filters?: { activeOnly?: boolean; policyType?: PolicyType }
  ): Promise<PaginatedResult<ExpensePolicy>> {
    const wsId = workspaceId.getValue();
    const where: Prisma.ExpensePolicyWhereInput = {
      workspaceId: wsId,
      ...(filters?.activeOnly ? { isActive: true } : {}),
      ...(filters?.policyType ? { policyType: filters.policyType } : {}),
    };
    return PrismaRepositoryHelper.paginate(
      this.prisma.expensePolicy,
      {
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      },
      (row) => this.toDomain(row as Prisma.ExpensePolicyGetPayload<object>),
      options
    );
  }

  async findActiveByWorkspace(
    workspaceId: WorkspaceId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpensePolicy>> {
    const wsId = workspaceId.getValue();
    return PrismaRepositoryHelper.paginate(
      this.prisma.expensePolicy,
      {
        where: {
          workspaceId: wsId,
          isActive: true,
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      },
      (row) => this.toDomain(row as Prisma.ExpensePolicyGetPayload<object>),
      options
    );
  }

  async findAllActiveByWorkspace(
    workspaceId: WorkspaceId
  ): Promise<ExpensePolicy[]> {
    const wsId = workspaceId.getValue();
    const rows = await this.prisma.expensePolicy.findMany({
      where: {
        workspaceId: wsId,
        isActive: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    return rows.map((row) => this.toDomain(row as Prisma.ExpensePolicyGetPayload<object>));
  }

  async findByType(
    workspaceId: WorkspaceId,
    policyType: PolicyType,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpensePolicy>> {
    const wsId = workspaceId.getValue();
    return PrismaRepositoryHelper.paginate(
      this.prisma.expensePolicy,
      {
        where: {
          workspaceId: wsId,
          policyType,
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      },
      (row) => this.toDomain(row as Prisma.ExpensePolicyGetPayload<object>),
      options
    );
  }

  async findByNameInWorkspace(
    workspaceId: WorkspaceId,
    name: string
  ): Promise<ExpensePolicy | null> {
    const wsId = workspaceId.getValue();
    const normalizedName = name.trim();
    const row = await this.prisma.expensePolicy.findFirst({
      where: {
        workspaceId: wsId,
        name: { equals: normalizedName, mode: 'insensitive' },
      },
    });

    return row ? this.toDomain(row) : null;
  }

  async delete(id: PolicyId): Promise<void> {
    await this.prisma.expensePolicy.delete({
      where: { id: id.getValue() },
    });
  }

  async hasActiveReferences(policyId: PolicyId): Promise<boolean> {
    const id = policyId.getValue();
    const [violationsCount, exemptionsCount] = await Promise.all([
      this.prisma.policyViolation.count({ where: { policyId: id } }),
      this.prisma.policyExemption.count({ where: { policyId: id } }),
    ]);
    return violationsCount > 0 || exemptionsCount > 0;
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
      createdBy: UserId.fromString(row.createdBy),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
