import { BankConnection } from "../../domain/entities/bank-connection.entity";
import { BankConnectionService } from "../services/bank-connection.service";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface GetBankConnectionsQuery {
  workspaceId: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

export class GetBankConnectionsHandler {
  constructor(private readonly bankConnectionService: BankConnectionService) {}

  async handle(
    query: GetBankConnectionsQuery,
  ): Promise<PaginatedResult<BankConnection>> {
    return await this.bankConnectionService.getConnections(query);
  }
}
