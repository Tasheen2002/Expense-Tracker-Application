import { ExpenseSplitService } from "../services/expense-split.service";
import { SplitType } from "../../domain/enums/split-type";

export interface CreateSplitCommand {
  expenseId: string;
  workspaceId: string;
  userId: string;
  splitType: SplitType;
  participants: Array<{
    userId: string;
    shareAmount?: number;
    sharePercentage?: number;
  }>;
}

export class CreateSplitHandler {
  constructor(private readonly splitService: ExpenseSplitService) {}

  async handle(command: CreateSplitCommand) {
    return await this.splitService.createSplit(command);
  }
}
