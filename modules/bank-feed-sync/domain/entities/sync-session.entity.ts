import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { BankConnectionId } from "../value-objects/bank-connection-id";
import { SyncSessionId } from "../value-objects/sync-session-id";
import { SyncStatus } from "../enums/sync-status.enum";

export interface SyncSessionProps {
  id: SyncSessionId;
  workspaceId: WorkspaceId;
  connectionId: BankConnectionId;
  status: SyncStatus;
  startedAt: Date;
  completedAt?: Date;
  transactionsFetched: number;
  transactionsImported: number;
  transactionsDuplicate: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class SyncSession {
  private constructor(private readonly props: SyncSessionProps) {}

  static create(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId,
    metadata?: Record<string, unknown>,
  ): SyncSession {
    return new SyncSession({
      id: SyncSessionId.create(),
      workspaceId,
      connectionId,
      status: SyncStatus.PENDING,
      startedAt: new Date(),
      transactionsFetched: 0,
      transactionsImported: 0,
      transactionsDuplicate: 0,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(props: SyncSessionProps): SyncSession {
    return new SyncSession(props);
  }

  // Getters
  get id(): SyncSessionId {
    return this.props.id;
  }

  get workspaceId(): WorkspaceId {
    return this.props.workspaceId;
  }

  get connectionId(): BankConnectionId {
    return this.props.connectionId;
  }

  get status(): SyncStatus {
    return this.props.status;
  }

  get startedAt(): Date {
    return this.props.startedAt;
  }

  get completedAt(): Date | undefined {
    return this.props.completedAt;
  }

  get transactionsFetched(): number {
    return this.props.transactionsFetched;
  }

  get transactionsImported(): number {
    return this.props.transactionsImported;
  }

  get transactionsDuplicate(): number {
    return this.props.transactionsDuplicate;
  }

  get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this.props.metadata;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Method-style getters for repository compatibility
  getId(): SyncSessionId {
    return this.props.id;
  }

  getWorkspaceId(): WorkspaceId {
    return this.props.workspaceId;
  }

  getConnectionId(): BankConnectionId {
    return this.props.connectionId;
  }

  getStatus(): SyncStatus {
    return this.props.status;
  }

  getStartedAt(): Date {
    return this.props.startedAt;
  }

  getCompletedAt(): Date | undefined {
    return this.props.completedAt;
  }

  getTransactionsFetched(): number {
    return this.props.transactionsFetched;
  }

  getTransactionsImported(): number {
    return this.props.transactionsImported;
  }

  getTransactionsDuplicate(): number {
    return this.props.transactionsDuplicate;
  }

  getErrorMessage(): string | undefined {
    return this.props.errorMessage;
  }

  getMetadata(): Record<string, unknown> | undefined {
    return this.props.metadata;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business methods
  start(): void {
    this.props.status = SyncStatus.IN_PROGRESS;
    this.props.updatedAt = new Date();
  }

  complete(
    transactionsFetched: number,
    transactionsImported: number,
    transactionsDuplicate: number,
  ): void {
    this.props.status = SyncStatus.COMPLETED;
    this.props.completedAt = new Date();
    this.props.transactionsFetched = transactionsFetched;
    this.props.transactionsImported = transactionsImported;
    this.props.transactionsDuplicate = transactionsDuplicate;
    this.props.updatedAt = new Date();
  }

  fail(errorMessage: string): void {
    this.props.status = SyncStatus.FAILED;
    this.props.completedAt = new Date();
    this.props.errorMessage = errorMessage;
    this.props.updatedAt = new Date();
  }

  partialComplete(
    transactionsFetched: number,
    transactionsImported: number,
    transactionsDuplicate: number,
    errorMessage: string,
  ): void {
    this.props.status = SyncStatus.PARTIAL;
    this.props.completedAt = new Date();
    this.props.transactionsFetched = transactionsFetched;
    this.props.transactionsImported = transactionsImported;
    this.props.transactionsDuplicate = transactionsDuplicate;
    this.props.errorMessage = errorMessage;
    this.props.updatedAt = new Date();
  }

  toPersistence(): SyncSessionProps {
    return { ...this.props };
  }
}
