import { ExpenseWorkflowRepository } from "../../domain/repositories/expense-workflow.repository";
import { ExpenseWorkflow } from "../../domain/entities/expense-workflow.entity";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface ListUserWorkflowsInput {
  userId: string;
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class ListUserWorkflowsHandler {
  constructor(private readonly workflowRepository: ExpenseWorkflowRepository) {}

  async handle(
    input: ListUserWorkflowsInput,
  ): Promise<PaginatedResult<ExpenseWorkflow>> {
    return await this.workflowRepository.findByUser(
      input.userId,
      input.workspaceId,
      {
        limit: input.limit,
        offset: input.offset,
      },
    );
  }
}
