import { PrismaClient } from "@prisma/client";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { SyncSession } from "../../domain/entities/sync-session.entity";
import { SyncSessionId } from "../../domain/value-objects/sync-session-id";
import { BankConnectionId } from "../../domain/value-objects/bank-connection-id";
import { ISyncSessionRepository } from "../../domain/repositories/sync-session.repository";
import { SyncStatus } from "../../domain/enums/sync-status.enum";

export class PrismaSyncSessionRepository implements ISyncSessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(session: SyncSession): Promise<void> {
    const data = {
      id: session.getId().getValue(),
      workspaceId: session.getWorkspaceId().getValue(),
      connectionId: session.getConnectionId().getValue(),
      status: session.getStatus(),
      startedAt: session.getStartedAt(),
      completedAt: session.getCompletedAt(),
      transactionsFetched: session.getTransactionsFetched(),
      transactionsImported: session.getTransactionsImported(),
      transactionsDuplicate: session.getTransactionsDuplicate(),
      errorMessage: session.getErrorMessage(),
      metadata: session.getMetadata() as any,
      createdAt: session.getCreatedAt(),
      updatedAt: session.getUpdatedAt(),
    };

    await this.prisma.syncSession.upsert({
      where: { id: session.getId().getValue() },
      create: data,
      update: data,
    });
  }

  async findById(
    id: SyncSessionId,
    workspaceId: WorkspaceId,
  ): Promise<SyncSession | null> {
    const record = await this.prisma.syncSession.findFirst({
      where: {
        id: id.getValue(),
        workspaceId: workspaceId.getValue(),
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByConnection(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId,
  ): Promise<SyncSession[]> {
    const records = await this.prisma.syncSession.findMany({
      where: {
        workspaceId: workspaceId.getValue(),
        connectionId: connectionId.getValue(),
      },
      orderBy: {
        startedAt: "desc",
      },
    });

    return records.map((r) => this.toDomain(r));
  }

  async findActiveByConnection(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId,
  ): Promise<SyncSession | null> {
    const record = await this.prisma.syncSession.findFirst({
      where: {
        workspaceId: workspaceId.getValue(),
        connectionId: connectionId.getValue(),
        status: {
          in: [SyncStatus.PENDING, SyncStatus.IN_PROGRESS],
        },
      },
      orderBy: {
        startedAt: "desc",
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async findLatestByConnection(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId,
  ): Promise<SyncSession | null> {
    const record = await this.prisma.syncSession.findFirst({
      where: {
        workspaceId: workspaceId.getValue(),
        connectionId: connectionId.getValue(),
      },
      orderBy: {
        startedAt: "desc",
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByStatus(
    workspaceId: WorkspaceId,
    status: SyncStatus,
  ): Promise<SyncSession[]> {
    const records = await this.prisma.syncSession.findMany({
      where: {
        workspaceId: workspaceId.getValue(),
        status,
      },
      orderBy: {
        startedAt: "desc",
      },
    });

    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: any): SyncSession {
    return SyncSession.fromPersistence({
      id: SyncSessionId.fromString(record.id),
      workspaceId: WorkspaceId.fromString(record.workspaceId),
      connectionId: BankConnectionId.fromString(record.connectionId),
      status: record.status as SyncStatus,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      transactionsFetched: record.transactionsFetched,
      transactionsImported: record.transactionsImported,
      transactionsDuplicate: record.transactionsDuplicate,
      errorMessage: record.errorMessage,
      metadata: record.metadata,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
