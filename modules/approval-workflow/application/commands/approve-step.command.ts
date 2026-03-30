import { WorkflowService } from '../services/workflow.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

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

  async handle(
    input: ApproveStepInput
  ): Promise<CommandResult<ExpenseWorkflowDTO>> {
    try {
      const workflow = await this.workflowService.approveStep(input);
      return CommandResult.success(workflow.toJSON());
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
