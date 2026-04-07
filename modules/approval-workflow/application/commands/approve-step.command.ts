import { WorkflowService } from '../services/workflow.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface ApproveStepInput extends ICommand {
  expenseId: string;
  workspaceId: string;
  approverId: string;
  comments?: string;
}

export class ApproveStepHandler implements ICommandHandler<
  ApproveStepInput,
  CommandResult<ExpenseWorkflowDTO>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(input: ApproveStepInput): Promise<CommandResult<ExpenseWorkflowDTO>> {
    const workflow = await this.workflowService.approveStep(input);
    return CommandResult.success(workflow);
  }
}
