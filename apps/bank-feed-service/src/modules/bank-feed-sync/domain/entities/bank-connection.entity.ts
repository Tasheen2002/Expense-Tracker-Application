import {  WorkspaceId, UserId  } from '@core/domain/value-objects';
import { BankConnectionId } from '../value-objects/bank-connection-id';
import { ConnectionStatus } from '../enums/connection-status.enum';
import { DomainEvent } from '@core/domain/events/domain-event';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { BankFeedSyncDomainError } from '../errors/bank-feed-sync.errors';

// ============================================================================
// Domain Events
// ============================================================================

export class BankConnectionCreatedEvent extends DomainEvent {
  constructor(
    public readonly connectionId: string,
    public readonly workspaceId: string,
    public readonly userId: string,
    public readonly institutionId: string,
    public readonly institutionName: string,
    public readonly accountName: string
  ) {
    super(connectionId, 'BankConnection');
  }

  get eventType(): string {
    return 'BankConnectionCreated';
  }

  getPayload(): Record<string, unknown> {
    return {
      connectionId: this.connectionId,
      workspaceId: this.workspaceId,
      userId: this.userId,
      institutionId: this.institutionId,
      institutionName: this.institutionName,
      accountName: this.accountName,
    };
  }
}

export class BankConnectionActivatedEvent extends DomainEvent {
  constructor(
    public readonly connectionId: string,
    public readonly workspaceId: string
  ) {
    super(connectionId, 'BankConnection');
  }

  get eventType(): string {
    return 'BankConnectionActivated';
  }

  getPayload(): Record<string, unknown> {
    return {
      connectionId: this.connectionId,
      workspaceId: this.workspaceId,
    };
  }
}

export class BankConnectionDisconnectedEvent extends DomainEvent {
  constructor(
    public readonly connectionId: string,
    public readonly workspaceId: string,
    public readonly reason?: string
  ) {
    super(connectionId, 'BankConnection');
  }

  get eventType(): string {
    return 'BankConnectionDisconnected';
  }

  getPayload(): Record<string, unknown> {
    return {
      connectionId: this.connectionId,
      workspaceId: this.workspaceId,
      reason: this.reason,
    };
  }
}

export class BankConnectionExpiredEvent extends DomainEvent {
  constructor(
    public readonly connectionId: string,
    public readonly workspaceId: string
  ) {
    super(connectionId, 'BankConnection');
  }

  get eventType(): string {
    return 'BankConnectionExpired';
  }

  getPayload(): Record<string, unknown> {
    return {
      connectionId: this.connectionId,
      workspaceId: this.workspaceId,
    };
  }
}

export class BankConnectionSyncedEvent extends DomainEvent {
  constructor(
    public readonly connectionId: string,
    public readonly workspaceId: string,
    public readonly syncedAt: Date
  ) {
    super(connectionId, 'BankConnection');
  }

  get eventType(): string {
    return 'BankConnectionSynced';
  }

  getPayload(): Record<string, unknown> {
    return {
      connectionId: this.connectionId,
      workspaceId: this.workspaceId,
      syncedAt: this.syncedAt.toISOString(),
    };
  }
}

export class BankConnectionErrorEvent extends DomainEvent {
  constructor(
    public readonly connectionId: string,
    public readonly workspaceId: string,
    public readonly errorMessage: string
  ) {
    super(connectionId, 'BankConnection');
  }

  get eventType(): string {
    return 'BankConnectionError';
  }

  getPayload(): Record<string, unknown> {
    return {
      connectionId: this.connectionId,
      workspaceId: this.workspaceId,
      errorMessage: this.errorMessage,
    };
  }
}

export class BankConnectionTokenUpdatedEvent extends DomainEvent {
  constructor(
    public readonly connectionId: string,
    public readonly workspaceId: string,
    public readonly expiresAt?: Date
  ) {
    super(connectionId, 'BankConnection');
  }

  get eventType(): string {
    return 'BankConnectionTokenUpdated';
  }

  getPayload(): Record<string, unknown> {
    return {
      connectionId: this.connectionId,
      workspaceId: this.workspaceId,
      expiresAt: this.expiresAt?.toISOString(),
    };
  }
}

export class BankConnectionDeletedEvent extends DomainEvent {
  constructor(
    public readonly connectionId: string,
    public readonly workspaceId: string
  ) {
    super(connectionId, 'BankConnection');
  }

  get eventType(): string {
    return 'BankConnectionDeleted';
  }

  getPayload(): Record<string, unknown> {
    return {
      connectionId: this.connectionId,
      workspaceId: this.workspaceId,
    };
  }
}

export interface BankConnectionDTO {
  id: string;
  workspaceId: string;
  userId: string;
  institutionId: string;
  institutionName: string;
  accountId: string;
  accountName: string;
  accountType: string;
  accountMask?: string;
  currency: string;
  status: string;
  lastSyncAt?: Date;
  tokenExpiresAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankConnectionProps {
  id: BankConnectionId;
  workspaceId: WorkspaceId;
  userId: UserId;
  institutionId: string;
  institutionName: string;
  accountId: string;
  accountName: string;
  accountType: string;
  accountMask?: string;
  currency: string;
  accessToken: string;
  status: ConnectionStatus;
  lastSyncAt?: Date;
  tokenExpiresAt?: Date;
  errorMessage?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class BankConnection extends AggregateRoot {
  private constructor(private props: BankConnectionProps, private persisted = false) {
    super();
    this.props = { ...props,
      lastSyncAt: props.lastSyncAt ? new Date(props.lastSyncAt) : props.lastSyncAt,
      tokenExpiresAt: props.tokenExpiresAt ? new Date(props.tokenExpiresAt) : props.tokenExpiresAt,
      createdAt: props.createdAt ? new Date(props.createdAt) : props.createdAt,
      updatedAt: props.updatedAt ? new Date(props.updatedAt) : props.updatedAt,
    };
  }

  static create(
    workspaceId: WorkspaceId,
    userId: UserId,
    institutionId: string,
    institutionName: string,
    accountId: string,
    accountName: string,
    accountType: string,
    currency: string,
    accessToken: string,
    accountMask?: string,
    tokenExpiresAt?: Date
  ): BankConnection {
    BankConnection.validateDetails(institutionId, institutionName, accountId, accountName, accountType, currency);
    BankConnection.validateToken(accessToken, tokenExpiresAt);
    const connection = new BankConnection({
      id: BankConnectionId.create(),
      workspaceId,
      userId,
      institutionId,
      institutionName,
      accountId,
      accountName,
      accountType,
      accountMask,
      currency,
      accessToken,
      status: ConnectionStatus.PENDING,
      tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : undefined,
      version: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    connection.addDomainEvent(
      new BankConnectionCreatedEvent(
        connection.id.getValue(),
        connection.workspaceId.getValue(),
        connection.userId.getValue(),
        institutionId,
        institutionName,
        accountName
      )
    );

    return connection;
  }

  static fromPersistence(props: BankConnectionProps): BankConnection {
    return new BankConnection(props, true);
  }

  // Getters
  get id(): BankConnectionId {
    return this.props.id;
  }

  get workspaceId(): WorkspaceId {
    return this.props.workspaceId;
  }

  get userId(): UserId {
    return this.props.userId;
  }

  get institutionId(): string {
    return this.props.institutionId;
  }

  get institutionName(): string {
    return this.props.institutionName;
  }

  get accountId(): string {
    return this.props.accountId;
  }

  get accountName(): string {
    return this.props.accountName;
  }

  get accountType(): string {
    return this.props.accountType;
  }

  get accountMask(): string | undefined {
    return this.props.accountMask;
  }

  get currency(): string {
    return this.props.currency;
  }

  get status(): ConnectionStatus {
    return this.props.status;
  }

  get lastSyncAt(): Date | undefined {
    return this.props.lastSyncAt ? new Date(this.props.lastSyncAt) : undefined;
  }

  get tokenExpiresAt(): Date | undefined {
    return this.props.tokenExpiresAt ? new Date(this.props.tokenExpiresAt) : undefined;
  }

  get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }

  get version(): number {
    return this.props.version;
  }

  get isPersisted(): boolean {
    return this.persisted;
  }

  markPersisted(version: number): void {
    this.props.version = version;
    this.persisted = true;
  }

  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }

  get updatedAt(): Date {
    return new Date(this.props.updatedAt);
  }

  /**
   * Returns a masked version of the access token for logging/display purposes.
   */
  get accessTokenMasked(): string {
    const token = this.props.accessToken;
    if (token.length <= 8) return '****';
    return token.substring(0, 4) + '****' + token.substring(token.length - 4);
  }

  /**
   * Returns the actual access token for sync operations.
   * @internal This should only be used by BankSyncService
   */
  get accessTokenForSync(): string {
    return this.props.accessToken;
  }

  // Business methods
  activate(): void {
    if (this.props.status !== ConnectionStatus.PENDING) {
      throw new BankFeedSyncDomainError('Only pending connections can be activated', 'INVALID_CONNECTION_TRANSITION', 409);
    }
    this.props.status = ConnectionStatus.CONNECTED;
    this.props.errorMessage = undefined;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BankConnectionActivatedEvent(
        this.id.getValue(),
        this.workspaceId.getValue()
      )
    );
  }

  markAsExpired(): void {
    if (this.props.status !== ConnectionStatus.CONNECTED) {
      throw new BankFeedSyncDomainError('Only connected accounts can expire', 'INVALID_CONNECTION_TRANSITION', 409);
    }
    this.props.status = ConnectionStatus.EXPIRED;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BankConnectionExpiredEvent(
        this.id.getValue(),
        this.workspaceId.getValue()
      )
    );
  }

  markAsError(errorMessage: string): void {
    if (this.props.status === ConnectionStatus.DISCONNECTED || this.props.status === ConnectionStatus.DELETED) return;
    this.props.status = ConnectionStatus.ERROR;
    this.props.errorMessage = errorMessage;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BankConnectionErrorEvent(
        this.id.getValue(),
        this.workspaceId.getValue(),
        errorMessage
      )
    );
  }

  disconnect(): void {
    if (this.props.status === ConnectionStatus.DISCONNECTED) return;
    if (this.props.status === ConnectionStatus.DELETED) {
      throw new BankFeedSyncDomainError('Deleted connection cannot be disconnected', 'INVALID_CONNECTION_TRANSITION', 409);
    }
    this.props.status = ConnectionStatus.DISCONNECTED;
    this.props.accessToken = '';
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BankConnectionDisconnectedEvent(
        this.id.getValue(),
        this.workspaceId.getValue()
      )
    );
  }

  updateLastSync(): void {
    if (this.props.status !== ConnectionStatus.CONNECTED) {
      throw new BankFeedSyncDomainError('Inactive connection cannot be synchronized', 'INVALID_CONNECTION_TRANSITION', 409);
    }
    const syncedAt = new Date();
    this.props.lastSyncAt = syncedAt;
    this.props.updatedAt = syncedAt;

    this.addDomainEvent(
      new BankConnectionSyncedEvent(
        this.id.getValue(),
        this.workspaceId.getValue(),
        syncedAt
      )
    );
  }

  updateAccessToken(token: string, expiresAt?: Date): void {
    if (this.props.status === ConnectionStatus.DELETED) {
      throw new BankFeedSyncDomainError('Deleted connection cannot update its token', 'INVALID_CONNECTION_TRANSITION', 409);
    }
    BankConnection.validateToken(token, expiresAt);
    this.props.accessToken = token;
    this.props.tokenExpiresAt = expiresAt ? new Date(expiresAt) : undefined;
    this.props.status = ConnectionStatus.CONNECTED;
    this.props.errorMessage = undefined;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BankConnectionTokenUpdatedEvent(
        this.id.getValue(),
        this.workspaceId.getValue(),
        expiresAt
      )
    );
  }

  isExpired(): boolean {
    if (!this.props.tokenExpiresAt) return false;
    return new Date() >= this.props.tokenExpiresAt;
  }

  isActive(): boolean {
    return (
      this.props.status === ConnectionStatus.CONNECTED && !this.isExpired()
      && this.props.accessToken.length > 0
    );
  }

  markAsDeleted(): void {
    if (this.props.status === ConnectionStatus.DELETED) return;
    this.props.status = ConnectionStatus.DELETED;
    this.props.accessToken = '';
    this.props.tokenExpiresAt = undefined;
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new BankConnectionDeletedEvent(
        this.id.getValue(),
        this.workspaceId.getValue()
      )
    );
  }

  reconnect(details: {
    userId: UserId;
    institutionName: string;
    accountName: string;
    accountType: string;
    currency: string;
    accessToken: string;
    accountMask?: string;
    tokenExpiresAt?: Date;
  }): void {
    if (this.props.status !== ConnectionStatus.DISCONNECTED && this.props.status !== ConnectionStatus.DELETED) {
      throw new BankFeedSyncDomainError('Only disconnected or deleted connections can reconnect', 'INVALID_CONNECTION_TRANSITION', 409);
    }
    BankConnection.validateDetails(this.props.institutionId, details.institutionName, this.props.accountId,
      details.accountName, details.accountType, details.currency);
    BankConnection.validateToken(details.accessToken, details.tokenExpiresAt);
    this.props.userId = details.userId;
    this.props.institutionName = details.institutionName;
    this.props.accountName = details.accountName;
    this.props.accountType = details.accountType;
    this.props.currency = details.currency;
    this.props.accountMask = details.accountMask;
    this.props.accessToken = details.accessToken;
    this.props.tokenExpiresAt = details.tokenExpiresAt ? new Date(details.tokenExpiresAt) : undefined;
    this.props.status = ConnectionStatus.CONNECTED;
    this.props.errorMessage = undefined;
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new BankConnectionActivatedEvent(this.id.getValue(), this.workspaceId.getValue())
    );
  }

  private static validateDetails(
    institutionId: string, institutionName: string, accountId: string,
    accountName: string, accountType: string, currency: string
  ): void {
    if ([institutionId, institutionName, accountId, accountName, accountType].some((value) => !value.trim()) ||
        !/^[A-Z]{3}$/.test(currency)) {
      throw new BankFeedSyncDomainError('Invalid bank connection details', 'INVALID_CONNECTION_DETAILS', 422);
    }
  }

  private static validateToken(token: string, expiresAt?: Date): void {
    if (!token.trim() || (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()))) {
      throw new BankFeedSyncDomainError('Valid, unexpired bank token is required', 'INVALID_BANK_TOKEN', 422);
    }
  }

  static toDTO(connection: BankConnection): BankConnectionDTO {
    return {
      id: connection.id.getValue(),
      workspaceId: connection.workspaceId.getValue(),
      userId: connection.userId.getValue(),
      institutionId: connection.institutionId,
      institutionName: connection.institutionName,
      accountId: connection.accountId,
      accountName: connection.accountName,
      accountType: connection.accountType,
      accountMask: connection.accountMask,
      currency: connection.currency,
      status: connection.status,
      lastSyncAt: connection.lastSyncAt,
      tokenExpiresAt: connection.tokenExpiresAt,
      errorMessage: connection.errorMessage,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }
}
