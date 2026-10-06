import {
  PrismaClient,
  RuleExecution as PrismaRuleExecution,
} from '@prisma/client';
import { IRuleExecutionRepository } from '../../domain/repositories/rule-execution.repository';
import { RuleExecution } from '../../domain/entities/rule-execution.entity';
import { RuleExecutionId } from '../../domain/value-objects/rule-execution-id';
import { RuleId } from '../../domain/value-objects/rule-id';
import {  WorkspaceId  } from '@core/domain/value-objects';
import {  ExpenseId, CategoryId  } from '@core/domain/value-objects';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';

export class PrismaRuleExecutionRepository
  implements IRuleExecutionRepository
{
  constructor(protected readonly prisma: PrismaClient) {}

  async findById(id: RuleExecutionId, workspaceId: WorkspaceId): Promise<RuleExecution | null> {
    const execution = await this.prisma.ruleExecution.findFirst({
      where: {
        id: id.getValue(),
        workspaceId: workspaceId.getValue(),
      },
    });

    if (!execution) {
      return null;
    }

    return this.toDomain(execution);
  }

  async findByRuleId(
    ruleId: RuleId,
    workspaceId: WorkspaceId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<RuleExecution>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.ruleExecution,
      {
        where: { ruleId: ruleId.getValue(), workspaceId: workspaceId.getValue() },
        orderBy: [{ executedAt: 'desc' }, { id: 'asc' }],
      },
      (execution) => this.toDomain(execution),
      options
    );
  }

  async findByExpenseId(
    expenseId: ExpenseId,
    workspaceId: WorkspaceId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<RuleExecution>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.ruleExecution,
      {
        where: {
          expenseId: expenseId.getValue(),
          workspaceId: workspaceId.getValue(),
        },
        orderBy: [{ executedAt: 'desc' }, { id: 'asc' }],
      },
      (raw) => this.toDomain(raw),
      options
    );
  }

  async findByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<RuleExecution>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.ruleExecution,
      {
        where: { workspaceId: workspaceId.getValue() },
        orderBy: [{ executedAt: 'desc' }, { id: 'asc' }],
      },
      (execution) => this.toDomain(execution),
      options
    );
  }

  private toDomain(raw: PrismaRuleExecution): RuleExecution {
    return RuleExecution.fromPersistence({
      id: RuleExecutionId.fromString(raw.id),
      ruleId: RuleId.fromString(raw.ruleId),
      expenseId: ExpenseId.fromString(raw.expenseId),
      workspaceId: WorkspaceId.fromString(raw.workspaceId),
      appliedCategoryId: CategoryId.fromString(raw.appliedCategoryId),
      executedAt: raw.executedAt,
    });
  }
}
