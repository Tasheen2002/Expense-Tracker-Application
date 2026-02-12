import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";
import { BankConnectionId } from "../value-objects/bank-connection-id";
import { ConnectionStatus } from "../enums/connection-status.enum";
import { DomainEvent } from "../../../../apps/api/src/shared/domain/events";
import { AggregateRoot } from "../../../../apps/api/src/shared/domain/aggregate-root";

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
    public readonly accountName: string,
  ) {
    super(connectionId, "BankConnection");
  }

  get eventType(): string {
    return "BankConnectionCreated";
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
    public readonly workspaceId: string,
  ) {
    super(connectionId, "BankConnection");
  }

  get eventType(): string {
    return "BankConnectionActivated";
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
    public readonly reason?: string,
  ) {
    super(connectionId, "BankConnection");
  }

  get eventType(): string {
    return "BankConnectionDisconnected";
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
    public readonly workspaceId: string,
  ) {
    super(connectionId, "BankConnection");
  }

  get eventType(): string {
    return "BankConnectionExpired";
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
    public readonly syncedAt: Date,
  ) {
    super(connectionId, "BankConnection");
  }

  get eventType(): string {
    return "BankConnectionSynced";
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
    public readonly errorMessage: string,
  ) {
    super(connectionId, "BankConnection");
  }

  get eventType(): string {
    return "BankConnectionError";
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
    public readonly expiresAt?: Date,
  ) {
    super(connectionId, "BankConnection");
  }

  get eventType(): string {
    return "BankConnectionTokenUpdated";
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
  accessToken: string;
  status: ConnectionStatus;
  lastSyncAt?: Date;
  tokenExpiresAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class BankConnection extends AggregateRoot {
  private constructor(private readonly props: BankConnectionProps) {
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
    tokenExpiresAt?: Date,
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
        connection.getId().getValue(),
        connection.getWorkspaceId().getValue(),
        connection.getUserId().getValue(),
        institutionId,
        institutionName,
        accountName,
      ),
    );

    return connection;
  }

  static fromPersistence(props: BankConnectionProps): BankConnection {
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

  // Method-style getters for repository compatibility
  getId(): BankConnectionId {
    return this.props.id;
  }

  getWorkspaceId(): WorkspaceId {
    return this.props.workspaceId;
  }

  getUserId(): UserId {
    return this.props.userId;
  }

  getInstitutionId(): string {
    return this.props.institutionId;
  }

  getInstitutionName(): string {
    return this.props.institutionName;
  }

  getAccountId(): string {
    return this.props.accountId;
  }

  getAccountName(): string {
    return this.props.accountName;
  }

  getAccountType(): string {
    return this.props.accountType;
  }

  getAccountMask(): string | undefined {
    return this.props.accountMask;
  }

  getCurrency(): string {
    return this.props.currency;
  }

  /**
   * Returns a masked version of the access token for logging/display purposes.
   * Use getAccessTokenForSync() for actual API calls.
   */
  getAccessTokenMasked(): string {
    const token = this.props.accessToken;
    if (token.length <= 8) return "****";
    return token.substring(0, 4) + "****" + token.substring(token.length - 4);
  }

  /**
   * Returns the actual access token for sync operations.
   * @internal This should only be used by BankSyncService
   */
  getAccessTokenForSync(): string {
    return this.props.accessToken;
  }

  getStatus(): ConnectionStatus {
    return this.props.status;
  }

  getLastSyncAt(): Date | undefined {
    return this.props.lastSyncAt;
  }

  getTokenExpiresAt(): Date | undefined {
    return this.props.tokenExpiresAt;
  }

  getErrorMessage(): string | undefined {
    return this.props.errorMessage;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business methods
  activate(): void {
    this.props.status = ConnectionStatus.CONNECTED;
    this.props.errorMessage = undefined;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BankConnectionActivatedEvent(
        this.getId().getValue(),
        this.getWorkspaceId().getValue(),
      ),
    );
  }

  markAsExpired(): void {
    this.props.status = ConnectionStatus.EXPIRED;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BankConnectionExpiredEvent(
        this.getId().getValue(),
        this.getWorkspaceId().getValue(),
      ),
    );
  }

  markAsError(errorMessage: string): void {
    this.props.status = ConnectionStatus.ERROR;
    this.props.errorMessage = errorMessage;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BankConnectionErrorEvent(
        this.getId().getValue(),
        this.getWorkspaceId().getValue(),
        errorMessage,
      ),
    );
  }

  disconnect(): void {
    this.props.status = ConnectionStatus.DISCONNECTED;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BankConnectionDisconnectedEvent(
        this.getId().getValue(),
        this.getWorkspaceId().getValue(),
      ),
    );
  }

  updateLastSync(): void {
    const syncedAt = new Date();
    this.props.lastSyncAt = syncedAt;
    this.props.updatedAt = syncedAt;

    this.addDomainEvent(
      new BankConnectionSyncedEvent(
        this.getId().getValue(),
        this.getWorkspaceId().getValue(),
        syncedAt,
      ),
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
        this.getId().getValue(),
        this.getWorkspaceId().getValue(),
        expiresAt,
      ),
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

  toPersistence(): BankConnectionProps {
    return { ...this.props };
  }
}
