import { WorkflowService } from '../services/workflow.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
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
  CommandResult<ExpenseWorkflowDTO>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(input: CancelWorkflowInput): Promise<CommandResult<ExpenseWorkflowDTO>> {
    const workflow = await this.workflowService.cancelWorkflow(
      input.expenseId,
      input.workspaceId
    );
    return CommandResult.success(workflow);
  }
}
