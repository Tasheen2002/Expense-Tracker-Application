import { WorkspaceId } from '../../../identity-workspace';
import { BankConnectionId } from '../../domain/value-objects/bank-connection-id';
import { BankConnection } from '../../domain/entities/bank-connection.entity';
import { IBankConnectionRepository } from '../../domain/repositories/bank-connection.repository';
import { BankConnectionNotFoundError } from '../../domain/errors';
import { IQuery, IQueryHandler, QueryResult } from '../../../../apps/api/src/shared/application';
export interface GetBankConnectionQuery extends IQuery {
  workspaceId: string;
  connectionId: string;
}

export class GetBankConnectionHandler implements IQueryHandler<GetBankConnectionQuery, QueryResult<BankConnection>> {
  constructor(
    private readonly connectionRepository: IBankConnectionRepository
  ) {}

  async handle(
    query: GetBankConnectionQuery
  ): Promise<QueryResult<BankConnection>> {
    try {
      
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
        
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
