import { WorkflowService } from '../services/workflow.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
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
  CommandResult<ExpenseWorkflowDTO>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(
    input: InitiateWorkflowInput
  ): Promise<CommandResult<ExpenseWorkflowDTO>> {
    try {
      const workflow = await this.workflowService.initiateWorkflow(input);
      return CommandResult.success(workflow.toJSON());
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
