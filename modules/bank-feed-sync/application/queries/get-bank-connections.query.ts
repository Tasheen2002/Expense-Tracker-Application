import { WorkspaceId, UserId } from '../../../identity-workspace';
import { BankConnection } from '../../domain/entities/bank-connection.entity';
import { IBankConnectionRepository } from '../../domain/repositories/bank-connection.repository';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
import { QueryResult } from '../../../../apps/api/src/shared/application/query-result';

export interface GetBankConnectionsQuery {
  workspaceId: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

export class GetBankConnectionsHandler {
  constructor(
    private readonly connectionRepository: IBankConnectionRepository
  ) {}

  async handle(
    query: GetBankConnectionsQuery
  ): Promise<QueryResult<PaginatedResult<BankConnection>>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);
    const options: PaginationOptions = {
      limit: query.limit,
      offset: query.offset,
    };

    let result: PaginatedResult<BankConnection>;
    if (query.userId) {
      const userId = UserId.fromString(query.userId);
      result = await this.connectionRepository.findByUser(
        workspaceId,
        userId,
        options
      );
    } else {
      result = await this.connectionRepository.findByWorkspace(
        workspaceId,
        options
      );
    }

    return QueryResult.success(result);
  }
}
