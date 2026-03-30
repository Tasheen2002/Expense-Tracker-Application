import { WorkflowService } from '../services/workflow.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface DelegateStepInput extends ICommand {
  expenseId: string;
  workspaceId: string;
  fromUserId: string;
  toUserId: string;
}

export class DelegateStepHandler implements ICommandHandler<
  DelegateStepInput,
  CommandResult<ExpenseWorkflowDTO>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(
    input: DelegateStepInput
  ): Promise<CommandResult<ExpenseWorkflowDTO>> {
    try {
      const workflow = await this.workflowService.delegateStep(input);
      return CommandResult.success(workflow.toJSON());
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
