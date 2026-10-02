import { WorkspaceId, UserId } from '@core/domain/value-objects';
import { BankConnectionId } from '../value-objects/bank-connection-id';
import { SyncSessionId } from '../value-objects/sync-session-id';
import { SyncStatus } from '../enums/sync-status.enum';
import { DomainEvent } from '@core/domain/events/domain-event';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { BankFeedSyncDomainError } from '../errors/bank-feed-sync.errors';

// ============================================================================
// Domain Events
// ============================================================================

export class SyncSessionCreatedEvent extends DomainEvent {
  constructor(
    public readonly sessionId: string,
    public readonly connectionId: string,
    public readonly workspaceId: string
  ) {
    super(sessionId, 'SyncSession');
  }

  get eventType(): string {
    return 'SyncSessionCreated';
  }

  getPayload(): Record<string, unknown> {
    return {
      sessionId: this.sessionId,
      connectionId: this.connectionId,
      workspaceId: this.workspaceId,
    };
  }
}

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
    public readonly errorMessage: string,
    public readonly userId: string
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
      userId: this.userId,
    };
  }
}

export class SyncSessionPartiallyCompletedEvent extends DomainEvent {
  constructor(
    public readonly sessionId: string,
    public readonly workspaceId: string,
    public readonly connectionId: string,
    public readonly transactionsFetched: number,
    public readonly transactionsImported: number,
    public readonly transactionsDuplicate: number,
    public readonly errorMessage: string
  ) {
    super(sessionId, 'SyncSession');
  }

  get eventType(): string {
    return 'SyncSessionPartiallyCompleted';
  }

  getPayload(): Record<string, unknown> {
    return {
      sessionId: this.sessionId,
      workspaceId: this.workspaceId,
      connectionId: this.connectionId,
      transactionsFetched: this.transactionsFetched,
      transactionsImported: this.transactionsImported,
      transactionsDuplicate: this.transactionsDuplicate,
      errorMessage: this.errorMessage,
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
  private constructor(private props: SyncSessionProps, private persisted = false) {
    super();
    this.props = { ...props,
      startedAt: props.startedAt ? new Date(props.startedAt) : props.startedAt,
      completedAt: props.completedAt ? new Date(props.completedAt) : props.completedAt,
      createdAt: props.createdAt ? new Date(props.createdAt) : props.createdAt,
      updatedAt: props.updatedAt ? new Date(props.updatedAt) : props.updatedAt,
      metadata: props.metadata ? structuredClone(props.metadata) : undefined,
    };
  }

  static create(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId,
    metadata?: Record<string, unknown>
  ): SyncSession {
    const session = new SyncSession({
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

    session.addDomainEvent(
      new SyncSessionCreatedEvent(
        session.id.getValue(),
        session.connectionId.getValue(),
        session.workspaceId.getValue()
      )
    );

    return session;
  }

  static fromPersistence(props: SyncSessionProps): SyncSession {
    return new SyncSession(props, true);
  }

  get isPersisted(): boolean {
    return this.persisted;
  }

  markPersisted(): void {
    this.persisted = true;
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
    return new Date(this.props.startedAt);
  }

  get completedAt(): Date | undefined {
    return this.props.completedAt ? new Date(this.props.completedAt) : undefined;
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
    return this.props.metadata ? structuredClone(this.props.metadata) : undefined;
  }

  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }

  get updatedAt(): Date {
    return new Date(this.props.updatedAt);
  }

  // Business methods
  start(): void {
    this.requireStatus(SyncStatus.PENDING);
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
    this.requireStatus(SyncStatus.IN_PROGRESS);
    this.validateCounts(transactionsFetched, transactionsImported, transactionsDuplicate, true);
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

  fail(errorMessage: string, userId: UserId): void {
    if (this.props.status !== SyncStatus.PENDING && this.props.status !== SyncStatus.IN_PROGRESS) {
      throw new BankFeedSyncDomainError(
        `Cannot fail sync session from ${this.props.status}`,
        'INVALID_SYNC_TRANSITION',
        409
      );
    }
    if (!errorMessage.trim()) {
      throw new BankFeedSyncDomainError('Sync failure reason is required', 'INVALID_SYNC_FAILURE', 422);
    }
    this.props.status = SyncStatus.FAILED;
    this.props.completedAt = new Date();
    this.props.errorMessage = errorMessage;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new SyncSessionFailedEvent(
        this.id.getValue(),
        this.workspaceId.getValue(),
        this.connectionId.getValue(),
        errorMessage,
        userId.getValue()
      )
    );
  }

  partialComplete(
    transactionsFetched: number,
    transactionsImported: number,
    transactionsDuplicate: number,
    errorMessage: string
  ): void {
    this.requireStatus(SyncStatus.IN_PROGRESS);
    this.validateCounts(transactionsFetched, transactionsImported, transactionsDuplicate, false);
    if (!errorMessage.trim()) {
      throw new BankFeedSyncDomainError('Partial sync reason is required', 'INVALID_SYNC_FAILURE', 422);
    }
    this.props.status = SyncStatus.PARTIAL;
    this.props.completedAt = new Date();
    this.props.transactionsFetched = transactionsFetched;
    this.props.transactionsImported = transactionsImported;
    this.props.transactionsDuplicate = transactionsDuplicate;
    this.props.errorMessage = errorMessage;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new SyncSessionPartiallyCompletedEvent(
        this.id.getValue(),
        this.workspaceId.getValue(),
        this.connectionId.getValue(),
        transactionsFetched,
        transactionsImported,
        transactionsDuplicate,
        errorMessage
      )
    );
  }

  private requireStatus(expected: SyncStatus): void {
    if (this.props.status !== expected) {
      throw new BankFeedSyncDomainError(
        `Cannot change sync session from ${this.props.status}; expected ${expected}`,
        'INVALID_SYNC_TRANSITION',
        409
      );
    }
  }

  private validateCounts(fetched: number, imported: number, duplicate: number, complete: boolean): void {
    if (![fetched, imported, duplicate].every((count) => Number.isSafeInteger(count) && count >= 0) ||
      (complete ? imported + duplicate !== fetched : imported + duplicate > fetched)) {
      throw new BankFeedSyncDomainError('Invalid sync transaction counts', 'INVALID_SYNC_COUNTS', 422);
    }
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
