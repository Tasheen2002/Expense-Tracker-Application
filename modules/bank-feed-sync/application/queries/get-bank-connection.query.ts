import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { BankConnectionId } from '../../domain/value-objects/bank-connection-id';
import { IBankConnectionRepository } from '../../domain/repositories/bank-connection.repository';
import { BankConnection, BankConnectionDTO } from '../../domain/entities/bank-connection.entity';
import { BankConnectionNotFoundError } from '../../domain/errors/bank-feed-sync.errors';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface GetBankConnectionQuery extends IQuery {
  workspaceId: string;
  connectionId: string;
}

export class GetBankConnectionHandler implements IQueryHandler<
  GetBankConnectionQuery,
  QueryResult<BankConnectionDTO>
> {
  constructor(
    private readonly connectionRepository: IBankConnectionRepository
  ) {}

  async handle(
    query: GetBankConnectionQuery
  ): Promise<QueryResult<BankConnectionDTO>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);
    const connectionId = BankConnectionId.fromString(query.connectionId);

    const connection = await this.connectionRepository.findById(
      connectionId,
      workspaceId
    );

    if (!connection) {
      throw new BankConnectionNotFoundError(query.connectionId);
    }

    return QueryResult.success(BankConnection.toDTO(connection));
  }
}
