import { WorkflowService } from '../services/workflow.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface RejectStepInput extends ICommand {
  expenseId: string;
  workspaceId: string;
  approverId: string;
  comments: string;
}

export class RejectStepHandler implements ICommandHandler<
  RejectStepInput,
  CommandResult<ExpenseWorkflowDTO>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(
    input: RejectStepInput
  ): Promise<CommandResult<ExpenseWorkflowDTO>> {
    try {
      const workflow = await this.workflowService.rejectStep(input);
      return CommandResult.success(workflow.toJSON());
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
