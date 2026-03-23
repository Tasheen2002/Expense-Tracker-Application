import { WorkflowService } from '../services/workflow.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface CancelWorkflowInput extends ICommand {
  expenseId: string;
  workspaceId: string;
  cancelledBy: string;
}

export class CancelWorkflowHandler implements ICommandHandler<
  CancelWorkflowInput,
  CommandResult<void>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(input: CancelWorkflowInput): Promise<CommandResult<void>> {
    try {
      await this.workflowService.cancelWorkflow(
        input.expenseId,
        input.workspaceId,
        input.cancelledBy
      );
      return CommandResult.success();
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}

export type CancelWorkflowCommand = CancelWorkflowInput;
