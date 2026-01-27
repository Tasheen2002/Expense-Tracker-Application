import { ExpenseWorkflow } from '../entities/expense-workflow.entity'

export interface ExpenseWorkflowRepository {
  save(workflow: ExpenseWorkflow): Promise<void>
  findByExpenseId(expenseId: string): Promise<ExpenseWorkflow | null>
  findByWorkspace(workspaceId: string): Promise<ExpenseWorkflow[]>
  findPendingByApprover(approverId: string, workspaceId: string): Promise<ExpenseWorkflow[]>
  findByUser(userId: string, workspaceId: string): Promise<ExpenseWorkflow[]>
}
