import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { BankConnectionId } from '../value-objects/bank-connection-id';
import { SyncSessionId } from '../value-objects/sync-session-id';
import { SyncStatus } from '../enums/sync-status.enum';
import { DomainEvent } from '../../../../packages/core/src/domain/events/domain-event';
import { AggregateRoot } from '../../../../packages/core/src/domain/aggregate-root';

// ============================================================================
// Domain Events
// ============================================================================

export class SyncSessionStartedEvent extends DomainEvent {
  constructor(
    public readonly sessionId: string,
    public readonly workspaceId: string,
    public readonly connectionId: string
  ) {
    super(sessionId, 'SyncSession');
  }

  get eventType(): string {
    return 'SyncSessionStarted';
  }

  getPayload(): Record<string, unknown> {
    return {
      sessionId: this.sessionId,
      workspaceId: this.workspaceId,
      connectionId: this.connectionId,
    };
  }
}

export class SyncSessionCompletedEvent extends DomainEvent {
  constructor(
    public readonly sessionId: string,
    public readonly workspaceId: string,
    public readonly connectionId: string,
    public readonly transactionsFetched: number,
    public readonly transactionsImported: number,
    public readonly transactionsDuplicate: number
  ) {
    super(sessionId, 'SyncSession');
  }

  get eventType(): string {
    return 'SyncSessionCompleted';
  }

  getPayload(): Record<string, unknown> {
    return {
      sessionId: this.sessionId,
      workspaceId: this.workspaceId,
      connectionId: this.connectionId,
      transactionsFetched: this.transactionsFetched,
      transactionsImported: this.transactionsImported,
      transactionsDuplicate: this.transactionsDuplicate,
    };
  }
}

export class SyncSessionFailedEvent extends DomainEvent {
  constructor(
    public readonly sessionId: string,
    public readonly workspaceId: string,
    public readonly connectionId: string,
    public readonly errorMessage: string
  ) {
    super(sessionId, 'SyncSession');
  }

  get eventType(): string {
    return 'SyncSessionFailed';
  }

  getPayload(): Record<string, unknown> {
    return {
      sessionId: this.sessionId,
      workspaceId: this.workspaceId,
      connectionId: this.connectionId,
      errorMessage: this.errorMessage,
    };
  }
}

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

export class SyncSession extends AggregateRoot {
  private constructor(private props: SyncSessionProps) {
    super();
  }

  static create(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId,
    metadata?: Record<string, unknown>
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

  static reconstitute(props: SyncSessionProps): SyncSession {
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

  // Business methods
  start(): void {
    this.props.status = SyncStatus.IN_PROGRESS;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new SyncSessionStartedEvent(
        this.id.getValue(),
        this.workspaceId.getValue(),
        this.connectionId.getValue()
      )
    );
  }

  complete(
    transactionsFetched: number,
    transactionsImported: number,
    transactionsDuplicate: number
  ): void {
    this.props.status = SyncStatus.COMPLETED;
    this.props.completedAt = new Date();
    this.props.transactionsFetched = transactionsFetched;
    this.props.transactionsImported = transactionsImported;
    this.props.transactionsDuplicate = transactionsDuplicate;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new SyncSessionCompletedEvent(
        this.id.getValue(),
        this.workspaceId.getValue(),
        this.connectionId.getValue(),
        transactionsFetched,
        transactionsImported,
        transactionsDuplicate
      )
    );
  }

  fail(errorMessage: string): void {
    this.props.status = SyncStatus.FAILED;
    this.props.completedAt = new Date();
    this.props.errorMessage = errorMessage;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new SyncSessionFailedEvent(
        this.id.getValue(),
        this.workspaceId.getValue(),
        this.connectionId.getValue(),
        errorMessage
      )
    );
  }

  partialComplete(
    transactionsFetched: number,
    transactionsImported: number,
    transactionsDuplicate: number,
    errorMessage: string
  ): void {
    this.props.status = SyncStatus.PARTIAL;
    this.props.completedAt = new Date();
    this.props.transactionsFetched = transactionsFetched;
    this.props.transactionsImported = transactionsImported;
    this.props.transactionsDuplicate = transactionsDuplicate;
    this.props.errorMessage = errorMessage;
    this.props.updatedAt = new Date();
  }

  static toDTO(session: SyncSession): SyncSessionDTO {
    return {
      id: session.id.getValue(),
      workspaceId: session.workspaceId.getValue(),
      connectionId: session.connectionId.getValue(),
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      transactionsFetched: session.transactionsFetched,
      transactionsImported: session.transactionsImported,
      transactionsDuplicate: session.transactionsDuplicate,
      errorMessage: session.errorMessage,
    };
  }
}

export interface SyncSessionDTO {
  id: string;
  workspaceId: string;
  connectionId: string;
  status: string;
  startedAt: Date;
  completedAt?: Date;
  transactionsFetched: number;
  transactionsImported: number;
  transactionsDuplicate: number;
  errorMessage?: string;
}
