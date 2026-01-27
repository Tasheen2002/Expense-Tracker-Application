import { ExpenseWorkflowRepository } from '../../domain/repositories/expense-workflow.repository'
import { ExpenseWorkflow } from '../../domain/entities/expense-workflow.entity'

export interface ListUserWorkflowsInput {
  userId: string
  workspaceId: string
}

export class ListUserWorkflowsHandler {
  constructor(
    private readonly workflowRepository: ExpenseWorkflowRepository
  ) {}

  async handle(input: ListUserWorkflowsInput): Promise<ExpenseWorkflow[]> {
    return await this.workflowRepository.findByUser(
      input.userId,
      input.workspaceId
    )
  }
}
