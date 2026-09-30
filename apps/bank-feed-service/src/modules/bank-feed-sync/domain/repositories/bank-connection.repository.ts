import {  WorkspaceId, UserId  } from '@core/domain/value-objects';
import { BankConnection } from '../entities/bank-connection.entity';
import { BankConnectionId } from '../value-objects/bank-connection-id';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface IBankConnectionRepository {
  save(connection: BankConnection): Promise<void>;
  recordSyncSuccess(connection: BankConnection): Promise<boolean>;
  recordSyncFailure(connection: BankConnection): Promise<boolean>;
  findById(
    id: BankConnectionId,
    workspaceId: WorkspaceId
  ): Promise<BankConnection | null>;
  findByInstitutionAndAccount(
    workspaceId: WorkspaceId,
    institutionId: string,
    accountId: string
  ): Promise<BankConnection | null>;
  findByWorkspace(
    workspaceId: WorkspaceId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BankConnection>>;
  findByUser(
    workspaceId: WorkspaceId,
    userId: UserId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BankConnection>>;
}
