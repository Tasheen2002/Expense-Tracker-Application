import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";
import { BankConnection } from "../entities/bank-connection.entity";
import { BankConnectionId } from "../value-objects/bank-connection-id";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface IBankConnectionRepository {
  save(connection: BankConnection): Promise<void>;
  findById(
    id: BankConnectionId,
    workspaceId: WorkspaceId,
  ): Promise<BankConnection | null>;
  findByInstitutionAndAccount(
    workspaceId: WorkspaceId,
    institutionId: string,
    accountId: string,
  ): Promise<BankConnection | null>;
  findByWorkspace(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BankConnection>>;
  findByUser(
    workspaceId: WorkspaceId,
    userId: UserId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BankConnection>>;
  delete(id: BankConnectionId, workspaceId: WorkspaceId): Promise<void>;
}
