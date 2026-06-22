import { WorkflowService } from '../services/workflow.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import {
  ICommand,
  ICommandHandler,
} from '@core/application/cqrs';
import { CommandResult } from '@core/application/command-result';

export interface ApproveStepCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly approverId: string;
  readonly comments?: string;
}

export class ApproveStepHandler implements ICommandHandler<
  ApproveStepCommand,
  CommandResult<ExpenseWorkflowDTO>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(command: ApproveStepCommand): Promise<CommandResult<ExpenseWorkflowDTO>> {
    const workflow = await this.workflowService.approveStep(command);
    return CommandResult.success(workflow);
  }
}
