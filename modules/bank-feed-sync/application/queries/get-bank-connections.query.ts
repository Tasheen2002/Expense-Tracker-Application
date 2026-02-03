import { BankConnection } from "../../domain/entities/bank-connection.entity";
import { BankConnectionService } from "../services/bank-connection.service";

export interface GetBankConnectionsQuery {
  workspaceId: string;
  userId?: string;
}

export class GetBankConnectionsHandler {
  constructor(private readonly bankConnectionService: BankConnectionService) {}

  async handle(query: GetBankConnectionsQuery): Promise<BankConnection[]> {
    return await this.bankConnectionService.getConnections(query);
  }
}
