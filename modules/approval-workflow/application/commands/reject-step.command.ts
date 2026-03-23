import { WorkflowService } from '../services/workflow.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

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

export type RejectStepCommand = RejectStepInput;
