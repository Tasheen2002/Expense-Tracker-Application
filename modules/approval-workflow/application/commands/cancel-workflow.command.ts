import { WorkflowService } from '../services/workflow.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface CancelWorkflowCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
}

export class CancelWorkflowHandler implements ICommandHandler<
  CancelWorkflowCommand,
  CommandResult<ExpenseWorkflowDTO>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(command: CancelWorkflowCommand): Promise<CommandResult<ExpenseWorkflowDTO>> {
    const workflow = await this.workflowService.cancelWorkflow(
      command.expenseId,
      command.workspaceId
    );
    return CommandResult.success(workflow);
  }
}
