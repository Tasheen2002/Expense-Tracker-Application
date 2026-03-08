import { ICommand, ICommandHandler, CommandResult } from "../../../../apps/api/src/shared/application";
import { ExpenseSplitService } from "../services/expense-split.service";
import { SplitType } from "../../domain/enums/split-type";

export interface CreateSplitCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly splitType: SplitType;
  readonly participants: Array<{
    userId: string;
    shareAmount?: number;
    sharePercentage?: number;
  }>;
}

export class CreateSplitHandler implements ICommandHandler<CreateSplitCommand, CommandResult<any>> {
  constructor(private readonly splitService: ExpenseSplitService) {}

  async handle(command: CreateSplitCommand): Promise<CommandResult<any>> {
    try {
      const split = await this.splitService.createSplit(command);
      return CommandResult.success(split);
    } catch (error) {
      return CommandResult.failure(
        error instanceof Error ? error.message : "Failed to create split",
      );
    }
  }
}
