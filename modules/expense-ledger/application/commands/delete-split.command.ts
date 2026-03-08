import { ICommand, ICommandHandler, CommandResult } from "../../../../apps/api/src/shared/application";
import { ExpenseSplitService } from "../services/expense-split.service";

export interface DeleteSplitCommand extends ICommand {
  readonly splitId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class DeleteSplitHandler implements ICommandHandler<DeleteSplitCommand, CommandResult<void>> {
  constructor(private readonly splitService: ExpenseSplitService) {}

  async handle(command: DeleteSplitCommand): Promise<CommandResult<void>> {
    try {
      await this.splitService.deleteSplit(
        command.splitId,
        command.workspaceId,
        command.userId,
      );
      return CommandResult.success();
    } catch (error) {
      return CommandResult.failure(
        error instanceof Error ? error.message : "Failed to delete split",
      );
    }
  }
}
