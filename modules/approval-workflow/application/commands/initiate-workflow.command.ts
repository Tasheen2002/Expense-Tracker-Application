import { WorkflowService } from '../services/workflow.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
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
  CommandResult<ExpenseWorkflowDTO>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(input: InitiateWorkflowInput): Promise<CommandResult<ExpenseWorkflowDTO>> {
    const workflow = await this.workflowService.initiateWorkflow(input);
    return CommandResult.success(workflow);
  }
}
