import { WorkflowService } from '../services/workflow.service';
import { OperationService } from '../services/operation.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface InitiateWorkflowCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly authToken?: string;
}

export class InitiateWorkflowHandler implements ICommandHandler<
  InitiateWorkflowCommand,
  CommandResult<ExpenseWorkflowDTO>
> {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly operations: OperationService
  ) {}

  async handle(command: InitiateWorkflowCommand): Promise<CommandResult<ExpenseWorkflowDTO>> {
    await this.operations.authorize({
      actorId: command.userId,
      workspaceId: command.workspaceId,
      authToken: command.authToken,
    });
    const workflow = await this.workflowService.initiateWorkflow(command);
    return CommandResult.success(workflow);
  }
}
