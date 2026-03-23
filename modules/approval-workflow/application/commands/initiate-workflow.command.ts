import { WorkflowService } from '../services/workflow.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

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
  CommandResult<{ workflowId: string }>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(
    input: InitiateWorkflowInput
  ): Promise<CommandResult<{ workflowId: string }>> {
    try {
      const workflow = await this.workflowService.initiateWorkflow(input);
      return CommandResult.success({ workflowId: workflow.getId().getValue() });
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}

export type InitiateWorkflowCommand = InitiateWorkflowInput;
