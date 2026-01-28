import { ExpenseWorkflowRepository } from "../../domain/repositories/expense-workflow.repository";
import { ExpenseWorkflow } from "../../domain/entities/expense-workflow.entity";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface ListPendingApprovalsInput {
  approverId: string;
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class ListPendingApprovalsHandler {
  constructor(private readonly workflowRepository: ExpenseWorkflowRepository) {}

  async handle(
    input: ListPendingApprovalsInput,
  ): Promise<PaginatedResult<ExpenseWorkflow>> {
    return await this.workflowRepository.findPendingByApprover(
      input.approverId,
      input.workspaceId,
      {
        limit: input.limit,
        offset: input.offset,
      },
    );
  }
}
