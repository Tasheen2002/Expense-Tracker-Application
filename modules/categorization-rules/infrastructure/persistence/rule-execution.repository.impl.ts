import {
  PrismaClient,
  RuleExecution as PrismaRuleExecution,
} from '@prisma/client';
import { IRuleExecutionRepository } from '../../domain/repositories/rule-execution.repository';
import { RuleExecution } from '../../domain/entities/rule-execution.entity';
import { RuleExecutionId } from '../../domain/value-objects/rule-execution-id';
import { RuleId } from '../../domain/value-objects/rule-id';
import { WorkspaceId } from '../../../identity-workspace';
import { ExpenseId, CategoryId } from '../../../expense-ledger';
import { CategorySuggestion } from '../../domain/entities/category-suggestion.entity';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';

export class PrismaRuleExecutionRepository
  implements IRuleExecutionRepository
{
  constructor(protected readonly prisma: PrismaClient) {}

  async save(execution: RuleExecution): Promise<void> {
    const data = {
      id: execution.getId().getValue(),
      ruleId: execution.getRuleId().getValue(),
      expenseId: execution.getExpenseId().getValue(),
      workspaceId: execution.getWorkspaceId().getValue(),
      appliedCategoryId: execution.getAppliedCategoryId().getValue(),
      executedAt: execution.getExecutedAt(),
    };

    await this.prisma.ruleExecution.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async saveWithSuggestion(
    execution: RuleExecution,
    suggestion: CategorySuggestion
  ): Promise<void> {
    const executionData = {
      id: execution.getId().getValue(),
      ruleId: execution.getRuleId().getValue(),
      expenseId: execution.getExpenseId().getValue(),
      workspaceId: execution.getWorkspaceId().getValue(),
      appliedCategoryId: execution.getAppliedCategoryId().getValue(),
      executedAt: execution.getExecutedAt(),
    };

    const suggestionData = {
      id: suggestion.getId().getValue(),
      workspaceId: suggestion.getWorkspaceId().getValue(),
      expenseId: suggestion.getExpenseId().getValue(),
      suggestedCategoryId: suggestion.getSuggestedCategoryId().getValue(),
      confidence: suggestion.getConfidence().getValue(),
      reason: suggestion.getReason(),
      isAccepted: suggestion.getIsAccepted(),
      createdAt: suggestion.getCreatedAt(),
      respondedAt: suggestion.getRespondedAt(),
    };

    await this.prisma.$transaction([
      this.prisma.ruleExecution.upsert({
        where: { id: executionData.id },
        create: executionData,
        update: executionData,
      }),
      this.prisma.categorySuggestion.upsert({
        where: { id: suggestionData.id },
        create: suggestionData,
        update: suggestionData,
      }),
    ]);
  }

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
    options?: PaginationOptions
  ): Promise<PaginatedResult<RuleExecution>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.ruleExecution,
      {
        where: { ruleId: ruleId.getValue() },
        orderBy: { executedAt: 'desc' },
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
        orderBy: { executedAt: 'desc' },
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
        orderBy: { executedAt: 'desc' },
      },
      (execution) => this.toDomain(execution),
      options
    );
  }

  async delete(id: RuleExecutionId): Promise<void> {
    await this.prisma.ruleExecution.delete({
      where: { id: id.getValue() },
    });
  }

  private toDomain(raw: PrismaRuleExecution): RuleExecution {
    return RuleExecution.reconstitute({
      id: RuleExecutionId.fromString(raw.id),
      ruleId: RuleId.fromString(raw.ruleId),
      expenseId: ExpenseId.fromString(raw.expenseId),
      workspaceId: WorkspaceId.fromString(raw.workspaceId),
      appliedCategoryId: CategoryId.fromString(raw.appliedCategoryId),
      executedAt: raw.executedAt,
    });
  }
}
