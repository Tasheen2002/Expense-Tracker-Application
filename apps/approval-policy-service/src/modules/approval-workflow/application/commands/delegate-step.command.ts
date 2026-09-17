import { WorkflowService } from '../services/workflow.service';
import { OperationService } from '../services/operation.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface DelegateStepCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly fromUserId: string;
  readonly toUserId: string;
  readonly authToken?: string;
}

export class DelegateStepHandler implements ICommandHandler<
  DelegateStepCommand,
  CommandResult<ExpenseWorkflowDTO>
> {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly operations: OperationService
  ) {}

  async handle(command: DelegateStepCommand): Promise<CommandResult<ExpenseWorkflowDTO>> {
    await this.operations.authorize({
      actorId: command.fromUserId,
      workspaceId: command.workspaceId,
      authToken: command.authToken,
    });
    const workflow = await this.workflowService.delegateStep(command);
    return CommandResult.success(workflow);
  }
}
