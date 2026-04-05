import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { UserId } from '../../../identity-workspace/domain/value-objects/user-id.vo';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';
import { IBankConnectionRepository } from '../../domain/repositories/bank-connection.repository';
import { BankConnection, BankConnectionDTO } from '../../domain/entities/bank-connection.entity';

export interface GetBankConnectionsQuery extends IQuery {
  workspaceId: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

export class GetBankConnectionsHandler implements IQueryHandler<
  GetBankConnectionsQuery,
  QueryResult<PaginatedResult<BankConnectionDTO>>
> {
  constructor(
    private readonly connectionRepository: IBankConnectionRepository
  ) {}

  async handle(
    query: GetBankConnectionsQuery
  ): Promise<QueryResult<PaginatedResult<BankConnectionDTO>>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);
    const options: PaginationOptions = {
      limit: query.limit,
      offset: query.offset,
    };

    let result;

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

    const dtoResult: PaginatedResult<BankConnectionDTO> = {
      ...result,
      items: result.items.map((connection) => BankConnection.toDTO(connection)),
    };

    return QueryResult.success(dtoResult);
  }
}
