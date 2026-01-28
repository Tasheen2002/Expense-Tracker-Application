import { PrismaClient } from '@prisma/client'
import { RuleExecutionRepository } from '../../domain/repositories/rule-execution.repository'
import { RuleExecution } from '../../domain/entities/rule-execution.entity'
import { RuleExecutionId } from '../../domain/value-objects/rule-execution-id'
import { RuleId } from '../../domain/value-objects/rule-id'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'
import { ExpenseId } from '../../../expense-ledger/domain/value-objects/expense-id'
import { CategoryId } from '../../../expense-ledger/domain/value-objects/category-id'

export class PrismaRuleExecutionRepository implements RuleExecutionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(execution: RuleExecution): Promise<void> {
    const data = {
      id: execution.getId().getValue(),
      ruleId: execution.getRuleId().getValue(),
      expenseId: execution.getExpenseId().getValue(),
      workspaceId: execution.getWorkspaceId().getValue(),
      appliedCategoryId: execution.getAppliedCategoryId().getValue(),
      executedAt: execution.getExecutedAt(),
    }

    await this.prisma.ruleExecution.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    })
  }

  async findById(id: RuleExecutionId): Promise<RuleExecution | null> {
    const execution = await this.prisma.ruleExecution.findUnique({
      where: { id: id.getValue() },
    })

    if (!execution) {
      return null
    }

    return this.toDomain(execution)
  }

  async findByRuleId(ruleId: RuleId): Promise<RuleExecution[]> {
    const executions = await this.prisma.ruleExecution.findMany({
      where: { ruleId: ruleId.getValue() },
      orderBy: { executedAt: 'desc' },
    })

    return executions.map((execution) => this.toDomain(execution))
  }

  async findByExpenseId(
    expenseId: ExpenseId,
    workspaceId: WorkspaceId
  ): Promise<RuleExecution[]> {
    const executions = await this.prisma.ruleExecution.findMany({
      where: {
        expenseId: expenseId.getValue(),
        workspaceId: workspaceId.getValue(),
      },
      orderBy: { executedAt: 'desc' },
    })

    return executions.map((execution) => this.toDomain(execution))
  }

  async findByWorkspaceId(
    workspaceId: WorkspaceId,
    limit?: number
  ): Promise<RuleExecution[]> {
    const executions = await this.prisma.ruleExecution.findMany({
      where: { workspaceId: workspaceId.getValue() },
      orderBy: { executedAt: 'desc' },
      take: limit,
    })

    return executions.map((execution) => this.toDomain(execution))
  }

  async delete(id: RuleExecutionId): Promise<void> {
    await this.prisma.ruleExecution.delete({
      where: { id: id.getValue() },
    })
  }

  private toDomain(raw: any): RuleExecution {
    return RuleExecution.reconstitute({
      id: RuleExecutionId.fromString(raw.id),
      ruleId: RuleId.fromString(raw.ruleId),
      expenseId: ExpenseId.fromString(raw.expenseId),
      workspaceId: WorkspaceId.fromString(raw.workspaceId),
      appliedCategoryId: CategoryId.fromString(raw.appliedCategoryId),
      executedAt: raw.executedAt,
    })
  }
}
