import { WorkflowService } from '../services/workflow.service';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface ApproveStepInput extends ICommand {
  expenseId: string;
  workspaceId: string;
  approverId: string;
  comments?: string;
}

export class ApproveStepHandler implements ICommandHandler<
  ApproveStepInput,
  CommandResult<void>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(input: ApproveStepInput): Promise<CommandResult<void>> {
    try {
      await this.workflowService.approveStep(input);
      return CommandResult.success();
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
