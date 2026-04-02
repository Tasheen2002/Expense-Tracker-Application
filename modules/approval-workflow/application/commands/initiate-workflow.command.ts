import { WorkflowService } from '../services/workflow.service';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface InitiateWorkflowInput extends ICommand {
  expenseId: string;
  workspaceId: string;
  userId: string;
  amount: number;
  categoryId?: string;
  hasReceipt: boolean;
}

export class InitiateWorkflowHandler implements ICommandHandler<
  InitiateWorkflowInput,
  CommandResult<string>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(input: InitiateWorkflowInput): Promise<CommandResult<string>> {
    try {
      const workflow = await this.workflowService.initiateWorkflow(input);
      return CommandResult.success(workflow.getExpenseId().getValue());
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
