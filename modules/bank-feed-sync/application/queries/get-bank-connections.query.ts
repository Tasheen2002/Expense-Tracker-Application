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

export interface BankConnectionResult {
  id: string;
  workspaceId: string;
  userId: string;
  institutionId: string;
  institutionName: string;
  accountId: string;
  accountName: string;
  accountType: string;
  accountMask?: string;
  currency: string;
  status: string;
  lastSyncAt?: Date;
  tokenExpiresAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetBankConnectionsQuery extends IQuery {
  workspaceId: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

export class GetBankConnectionsHandler implements IQueryHandler<
  GetBankConnectionsQuery,
  QueryResult<PaginatedResult<BankConnectionResult>>
> {
  constructor(
    private readonly connectionRepository: IBankConnectionRepository
  ) {}

  async handle(
    query: GetBankConnectionsQuery
  ): Promise<QueryResult<PaginatedResult<BankConnectionResult>>> {
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

    const dtoResult: PaginatedResult<BankConnectionResult> = {
      ...result,
      items: result.items.map((connection) => ({
        id: connection.id.getValue(),
        workspaceId: connection.workspaceId.getValue(),
        userId: connection.userId.getValue(),
        institutionId: connection.institutionId,
        institutionName: connection.institutionName,
        accountId: connection.accountId,
        accountName: connection.accountName,
        accountType: connection.accountType,
        accountMask: connection.accountMask,
        currency: connection.currency,
        status: connection.status,
        lastSyncAt: connection.lastSyncAt,
        tokenExpiresAt: connection.tokenExpiresAt,
        errorMessage: connection.errorMessage,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
      })),
    };

    return QueryResult.success(dtoResult);
  }
}
