import { WorkflowService } from '../services/workflow.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

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

export type ApproveStepCommand = ApproveStepInput;
