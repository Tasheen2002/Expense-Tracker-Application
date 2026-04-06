import { WorkflowService } from '../services/workflow.service';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface RejectStepInput extends ICommand {
  expenseId: string;
  workspaceId: string;
  approverId: string;
  comments: string;
}

export class RejectStepHandler implements ICommandHandler<
  RejectStepInput,
  CommandResult<void>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(input: RejectStepInput): Promise<CommandResult<void>> {
    try {
      await this.workflowService.rejectStep(input);
      return CommandResult.success();
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
