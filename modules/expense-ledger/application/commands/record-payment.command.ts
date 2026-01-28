import { ExpenseSplitService } from "../services/expense-split.service";

export interface RecordPaymentCommand {
  settlementId: string;
  workspaceId: string;
  userId: string;
  amount: number;
}

export class RecordPaymentHandler {
  constructor(private readonly splitService: ExpenseSplitService) {}

  async handle(command: RecordPaymentCommand) {
    return await this.splitService.recordPayment(command);
  }
}
