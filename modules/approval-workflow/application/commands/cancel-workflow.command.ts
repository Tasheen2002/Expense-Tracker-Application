import { ExpenseWorkflowRepository } from '../../domain/repositories/expense-workflow.repository'
import { ExpenseWorkflow } from '../../domain/entities/expense-workflow.entity'
import { WorkflowNotFoundError } from '../../domain/errors/approval-workflow.errors'

export interface CancelWorkflowInput {
  expenseId: string
  workspaceId: string
}

export class CancelWorkflowHandler {
  constructor(
    private readonly workflowRepository: ExpenseWorkflowRepository
  ) {}

  async handle(input: CancelWorkflowInput): Promise<ExpenseWorkflow> {
    const workflow = await this.workflowRepository.findByExpenseId(input.expenseId)

    if (!workflow) {
      throw new WorkflowNotFoundError(input.expenseId)
    }

    if (workflow.getWorkspaceId().getValue() !== input.workspaceId) {
      throw new WorkflowNotFoundError(input.expenseId)
    }

    workflow.cancel()

    await this.workflowRepository.save(workflow)

    return workflow
  }
}
