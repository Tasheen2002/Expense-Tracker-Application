import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { SyncSession } from "../entities/sync-session.entity";
import { SyncSessionId } from "../value-objects/sync-session-id";
import { BankConnectionId } from "../value-objects/bank-connection-id";
import { SyncStatus } from "../enums/sync-status.enum";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface ISyncSessionRepository {
  save(session: SyncSession): Promise<void>;
  findById(
    id: SyncSessionId,
    workspaceId: WorkspaceId,
  ): Promise<SyncSession | null>;
  findByConnection(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<SyncSession>>;
  findActiveByConnection(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId,
  ): Promise<SyncSession | null>;
  findLatestByConnection(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId,
  ): Promise<SyncSession | null>;
  findByStatus(
    workspaceId: WorkspaceId,
    status: SyncStatus,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<SyncSession>>;
}
