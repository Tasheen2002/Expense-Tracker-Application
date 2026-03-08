import { ICommand, ICommandHandler, CommandResult } from "../../../../apps/api/src/shared/application";
import { ExpenseSplitService } from "../services/expense-split.service";

export interface RecordPaymentCommand extends ICommand {
  readonly settlementId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly amount: number;
}

export class RecordPaymentHandler implements ICommandHandler<RecordPaymentCommand, CommandResult<any>> {
  constructor(private readonly splitService: ExpenseSplitService) {}

  async handle(command: RecordPaymentCommand): Promise<CommandResult<any>> {
    try {
      const result = await this.splitService.recordPayment(command);
      return CommandResult.success(result);
    } catch (error) {
      return CommandResult.failure(
        error instanceof Error ? error.message : "Failed to record payment",
      );
    }
  }
}
