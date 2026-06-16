import { WorkflowService } from '../services/workflow.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface DelegateStepCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly fromUserId: string;
  readonly toUserId: string;
}

export class DelegateStepHandler implements ICommandHandler<
  DelegateStepCommand,
  CommandResult<ExpenseWorkflowDTO>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(command: DelegateStepCommand): Promise<CommandResult<ExpenseWorkflowDTO>> {
    const workflow = await this.workflowService.delegateStep(command);
    return CommandResult.success(workflow);
  }
}
