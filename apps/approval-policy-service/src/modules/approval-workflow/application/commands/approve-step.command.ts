import { WorkflowService } from '../services/workflow.service';
import { OperationService } from '../services/operation.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface ApproveStepCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly approverId: string;
  readonly expectedStepNumber: number;
  readonly comments?: string;
  readonly authToken?: string;
}

export class ApproveStepHandler implements ICommandHandler<
  ApproveStepCommand,
  CommandResult<ExpenseWorkflowDTO>
> {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly operations: OperationService
  ) {}

  async handle(command: ApproveStepCommand): Promise<CommandResult<ExpenseWorkflowDTO>> {
    await this.operations.authorize({
      actorId: command.approverId,
      workspaceId: command.workspaceId,
      authToken: command.authToken,
    });
    const workflow = await this.workflowService.approveStep(command);
    return CommandResult.success(workflow);
  }
}
