import { WorkflowService } from '../services/workflow.service';
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
  CommandResult<void>
> {
  constructor(private readonly workflowService: WorkflowService) {}

  private getStatusCode(error: unknown): number {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      return (error as { statusCode: number }).statusCode;
    }
    return 500;
  }

  async handle(input: RejectStepInput): Promise<CommandResult<void>> {
    try {
      await this.workflowService.rejectStep(input);
      return CommandResult.success();
    } catch (error: unknown) {
      return CommandResult.failure(
        error instanceof Error ? error.message : 'Command failed',
        undefined,
        this.getStatusCode(error)
      );
    }
  }
}
