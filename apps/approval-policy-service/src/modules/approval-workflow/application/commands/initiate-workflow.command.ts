import { WorkflowService } from '../services/workflow.service';
import { ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import {
  ICommand,
  ICommandHandler,
} from '@core/application/cqrs';
import { CommandResult } from '@core/application/command-result';

export interface InitiateWorkflowCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly amount: number;
  readonly categoryId?: string;
  readonly hasReceipt: boolean;
}

export class InitiateWorkflowHandler implements ICommandHandler<
  InitiateWorkflowCommand,
  CommandResult<ExpenseWorkflowDTO>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  async handle(command: InitiateWorkflowCommand): Promise<CommandResult<ExpenseWorkflowDTO>> {
    const workflow = await this.workflowService.initiateWorkflow(command);
    return CommandResult.success(workflow);
  }
}
