import { WorkflowService } from '../services/workflow.service';
import { OperationService } from '../services/operation.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface CancelWorkflowCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly reason?: string;
  readonly authToken?: string;
}

export class CancelWorkflowHandler implements ICommandHandler<
  CancelWorkflowCommand,
  CommandResult<ExpenseWorkflowDTO>
> {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly operations: OperationService
  ) {}

  async handle(command: CancelWorkflowCommand): Promise<CommandResult<ExpenseWorkflowDTO>> {
    await this.operations.authorize({
      actorId: command.actorId,
      workspaceId: command.workspaceId,
      authToken: command.authToken,
    });
    const workflow = await this.workflowService.cancelWorkflow(
      command.expenseId,
      command.workspaceId,
      command.actorId,
      command.reason
    );
    return CommandResult.success(workflow);
  }
}
