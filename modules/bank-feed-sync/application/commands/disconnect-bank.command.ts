import { BankConnectionService } from "../services/bank-connection.service";

export interface DisconnectBankCommand {
  workspaceId: string;
  connectionId: string;
}

export class DisconnectBankHandler {
  constructor(private readonly bankConnectionService: BankConnectionService) {}

  async handle(command: DisconnectBankCommand): Promise<void> {
    await this.bankConnectionService.disconnectBank(command);
  }
}
