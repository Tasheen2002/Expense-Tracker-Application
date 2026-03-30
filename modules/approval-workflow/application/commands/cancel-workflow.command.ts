import { WorkflowService } from '../services/workflow.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface CancelWorkflowInput extends ICommand {
  expenseId: string;
  workspaceId: string;
}

export class CancelWorkflowHandler implements ICommandHandler<
  CancelWorkflowInput,
  CommandResult<ExpenseWorkflowDTO>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(
    input: CancelWorkflowInput
  ): Promise<CommandResult<ExpenseWorkflowDTO>> {
    try {
      const workflow = await this.workflowService.cancelWorkflow(
        input.expenseId,
        input.workspaceId
      );
      return CommandResult.success(workflow.toJSON());
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
