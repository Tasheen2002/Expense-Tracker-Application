import { WorkspaceId } from '../../../identity-workspace';
import { BankConnectionId } from '../../domain/value-objects/bank-connection-id';
import { BankConnection } from '../../domain/entities/bank-connection.entity';
import { IBankConnectionRepository } from '../../domain/repositories/bank-connection.repository';
import { BankConnectionNotFoundError } from '../../domain/errors';
import { QueryResult } from '../../../../apps/api/src/shared/application/query-result';

export interface GetBankConnectionQuery {
  workspaceId: string;
  connectionId: string;
}

export class GetBankConnectionHandler {
  constructor(
    private readonly connectionRepository: IBankConnectionRepository
  ) {}

  async handle(
    query: GetBankConnectionQuery
  ): Promise<QueryResult<BankConnection>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);
    const connectionId = BankConnectionId.fromString(query.connectionId);

    const connection = await this.connectionRepository.findById(
      connectionId,
      workspaceId
    );

    if (!connection) {
      throw new BankConnectionNotFoundError(query.connectionId);
    }

    return QueryResult.success(connection);
  }
}
