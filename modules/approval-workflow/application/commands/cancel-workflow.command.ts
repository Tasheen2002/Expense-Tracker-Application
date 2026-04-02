import { WorkflowService } from '../services/workflow.service';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface CancelWorkflowInput extends ICommand {
  expenseId: string;
  workspaceId: string;
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
        input.workspaceId
      );
      return CommandResult.success();
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
