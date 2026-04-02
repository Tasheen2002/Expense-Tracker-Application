import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { BankConnectionId } from '../../domain/value-objects/bank-connection-id';
import { IBankConnectionRepository } from '../../domain/repositories/bank-connection.repository';
import { BankConnectionNotFoundError } from '../../domain/errors/bank-feed-sync.errors';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

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

export interface GetBankConnectionQuery extends IQuery {
  workspaceId: string;
  connectionId: string;
}

export class GetBankConnectionHandler implements IQueryHandler<
  GetBankConnectionQuery,
  QueryResult<BankConnectionResult>
> {
  constructor(
    private readonly connectionRepository: IBankConnectionRepository
  ) {}

  async handle(
    query: GetBankConnectionQuery
  ): Promise<QueryResult<BankConnectionResult>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);
    const connectionId = BankConnectionId.fromString(query.connectionId);

    const connection = await this.connectionRepository.findById(
      connectionId,
      workspaceId
    );

    if (!connection) {
      throw new BankConnectionNotFoundError(query.connectionId);
    }

    const result: BankConnectionResult = {
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
    };

    return QueryResult.success(result);
  }
}
