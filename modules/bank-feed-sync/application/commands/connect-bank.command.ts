import { BankConnection } from "../../domain/entities/bank-connection.entity";
import { BankConnectionService } from "../services/bank-connection.service";

export interface ConnectBankCommand {
  workspaceId: string;
  userId: string;
  institutionId: string;
  institutionName: string;
  accountId: string;
  accountName: string;
  accountType: string;
  currency: string;
  accessToken: string;
  accountMask?: string;
  tokenExpiresAt?: Date;
}

export class ConnectBankHandler {
  constructor(private readonly bankConnectionService: BankConnectionService) {}

  async handle(command: ConnectBankCommand): Promise<BankConnection> {
    return await this.bankConnectionService.connectBank(command);
  }
}
