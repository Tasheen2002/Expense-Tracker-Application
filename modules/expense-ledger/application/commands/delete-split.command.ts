import { ExpenseSplitService } from "../services/expense-split.service";

export interface DeleteSplitCommand {
  splitId: string;
  workspaceId: string;
  userId: string;
}

export class DeleteSplitHandler {
  constructor(private readonly splitService: ExpenseSplitService) {}

  async handle(command: DeleteSplitCommand) {
    return await this.splitService.deleteSplit(
      command.splitId,
      command.workspaceId,
      command.userId,
    );
  }
}
