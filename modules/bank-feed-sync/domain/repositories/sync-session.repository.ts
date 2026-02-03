import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { SyncSession } from "../entities/sync-session.entity";
import { SyncSessionId } from "../value-objects/sync-session-id";
import { BankConnectionId } from "../value-objects/bank-connection-id";
import { SyncStatus } from "../enums/sync-status.enum";

export interface ISyncSessionRepository {
  save(session: SyncSession): Promise<void>;
  findById(
    id: SyncSessionId,
    workspaceId: WorkspaceId,
  ): Promise<SyncSession | null>;
  findByConnection(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId,
  ): Promise<SyncSession[]>;
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
  ): Promise<SyncSession[]>;
}
