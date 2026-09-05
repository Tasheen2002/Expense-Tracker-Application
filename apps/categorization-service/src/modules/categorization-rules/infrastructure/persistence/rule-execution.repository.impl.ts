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
import { CategorySuggestion } from '../../domain/entities/category-suggestion.entity';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';

export class PrismaRuleExecutionRepository
  implements IRuleExecutionRepository
{
  constructor(protected readonly prisma: PrismaClient) {}

  async save(execution: RuleExecution): Promise<void> {
    const data = {
      id: execution.id.getValue(),
      ruleId: execution.ruleId.getValue(),
      expenseId: execution.expenseId.getValue(),
      workspaceId: execution.workspaceId.getValue(),
      appliedCategoryId: execution.appliedCategoryId.getValue(),
      executedAt: execution.executedAt,
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
      id: execution.id.getValue(),
      ruleId: execution.ruleId.getValue(),
      expenseId: execution.expenseId.getValue(),
      workspaceId: execution.workspaceId.getValue(),
      appliedCategoryId: execution.appliedCategoryId.getValue(),
      executedAt: execution.executedAt,
    };

    const suggestionData = {
      id: suggestion.id.getValue(),
      workspaceId: suggestion.workspaceId.getValue(),
      expenseId: suggestion.expenseId.getValue(),
      suggestedCategoryId: suggestion.suggestedCategoryId.getValue(),
      confidence: suggestion.confidence.getValue(),
      reason: suggestion.reason,
      isAccepted: suggestion.isAccepted,
      createdAt: suggestion.createdAt,
      respondedAt: suggestion.respondedAt,
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
