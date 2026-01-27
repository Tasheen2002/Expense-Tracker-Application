import { ExpenseWorkflowRepository } from '../../domain/repositories/expense-workflow.repository'
import { ExpenseWorkflow } from '../../domain/entities/expense-workflow.entity'
import { WorkflowNotFoundError } from '../../domain/errors/approval-workflow.errors'

export interface GetWorkflowInput {
  expenseId: string
  workspaceId: string
}

export class GetWorkflowHandler {
  constructor(
    private readonly workflowRepository: ExpenseWorkflowRepository
  ) {}

  async handle(input: GetWorkflowInput): Promise<ExpenseWorkflow> {
    const workflow = await this.workflowRepository.findByExpenseId(input.expenseId)

    if (!workflow || workflow.getWorkspaceId().getValue() !== input.workspaceId) {
      throw new WorkflowNotFoundError(input.expenseId)
    }

    return workflow
  }
}
