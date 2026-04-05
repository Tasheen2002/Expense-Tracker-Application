import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { UserId } from '../../../identity-workspace/domain/value-objects/user-id.vo';
import { BankConnectionId } from '../value-objects/bank-connection-id';
import { ConnectionStatus } from '../enums/connection-status.enum';
import { DomainEvent } from '../../../../packages/core/src/domain/events/domain-event';
import { AggregateRoot } from '../../../../packages/core/src/domain/aggregate-root';

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
  // TODO: Encrypt accessToken at rest (infrastructure concern — use an encryption service)
  accessToken: string;
  status: ConnectionStatus;
  lastSyncAt?: Date;
  tokenExpiresAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class BankConnection extends AggregateRoot {
  private constructor(private props: BankConnectionProps) {
    super();
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
      tokenExpiresAt,
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

  static reconstitute(props: BankConnectionProps): BankConnection {
    return new BankConnection(props);
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
    return this.props.lastSyncAt;
  }

  get tokenExpiresAt(): Date | undefined {
    return this.props.tokenExpiresAt;
  }

  get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
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
    this.props.status = ConnectionStatus.DISCONNECTED;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BankConnectionDisconnectedEvent(
        this.id.getValue(),
        this.workspaceId.getValue()
      )
    );
  }

  updateLastSync(): void {
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
    this.props.accessToken = token;
    this.props.tokenExpiresAt = expiresAt;
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
    );
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
