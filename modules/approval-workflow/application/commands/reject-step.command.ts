import { WorkflowService } from '../services/workflow.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface RejectStepCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly approverId: string;
  readonly comments: string;
}

export class RejectStepHandler implements ICommandHandler<
  RejectStepCommand,
  CommandResult<ExpenseWorkflowDTO>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(command: RejectStepCommand): Promise<CommandResult<ExpenseWorkflowDTO>> {
    const workflow = await this.workflowService.rejectStep(command);
    return CommandResult.success(workflow);
  }
}
