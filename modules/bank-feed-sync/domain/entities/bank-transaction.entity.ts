import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { BankConnectionId } from '../value-objects/bank-connection-id';
import { BankTransactionId } from '../value-objects/bank-transaction-id';
import { SyncSessionId } from '../value-objects/sync-session-id';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { DomainEvent } from '../../../../packages/core/src/domain/events/domain-event';
import { AggregateRoot } from '../../../../packages/core/src/domain/aggregate-root';

// ============================================================================
// Domain Events
// ============================================================================

export class BankTransactionSyncedEvent extends DomainEvent {
  constructor(
    public readonly transactionId: string,
    public readonly workspaceId: string,
    public readonly connectionId: string,
    public readonly externalId: string,
    public readonly amount: number,
    public readonly currency: string
  ) {
    super(transactionId, 'BankTransaction');
  }

  get eventType(): string {
    return 'BankTransactionSynced';
  }

  getPayload(): Record<string, unknown> {
    return {
      transactionId: this.transactionId,
      workspaceId: this.workspaceId,
      connectionId: this.connectionId,
      externalId: this.externalId,
      amount: this.amount,
      currency: this.currency,
    };
  }
}

export class BankTransactionMatchedEvent extends DomainEvent {
  constructor(
    public readonly transactionId: string,
    public readonly workspaceId: string,
    public readonly expenseId: string
  ) {
    super(transactionId, 'BankTransaction');
  }

  get eventType(): string {
    return 'BankTransactionMatched';
  }

  getPayload(): Record<string, unknown> {
    return {
      transactionId: this.transactionId,
      workspaceId: this.workspaceId,
      expenseId: this.expenseId,
    };
  }
}

export class BankTransactionImportedEvent extends DomainEvent {
  constructor(
    public readonly transactionId: string,
    public readonly workspaceId: string,
    public readonly expenseId: string
  ) {
    super(transactionId, 'BankTransaction');
  }

  get eventType(): string {
    return 'BankTransactionImported';
  }

  getPayload(): Record<string, unknown> {
    return {
      transactionId: this.transactionId,
      workspaceId: this.workspaceId,
      expenseId: this.expenseId,
    };
  }
}

export class BankTransactionIgnoredEvent extends DomainEvent {
  constructor(
    public readonly transactionId: string,
    public readonly workspaceId: string
  ) {
    super(transactionId, 'BankTransaction');
  }

  get eventType(): string {
    return 'BankTransactionIgnored';
  }

  getPayload(): Record<string, unknown> {
    return {
      transactionId: this.transactionId,
      workspaceId: this.workspaceId,
    };
  }
}

export interface BankTransactionProps {
  id: BankTransactionId;
  workspaceId: WorkspaceId;
  connectionId: BankConnectionId;
  sessionId: SyncSessionId;
  externalId: string;
  amount: number;
  currency: string;
  description: string;
  merchantName?: string;
  categoryName?: string;
  transactionDate: Date;
  postedDate?: Date;
  status: TransactionStatus;
  expenseId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class BankTransaction extends AggregateRoot {
  private constructor(private props: BankTransactionProps) {
    super();
  }

  static create(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId,
    sessionId: SyncSessionId,
    externalId: string,
    amount: number,
    currency: string,
    description: string,
    transactionDate: Date,
    merchantName?: string,
    categoryName?: string,
    postedDate?: Date,
    metadata?: Record<string, unknown>
  ): BankTransaction {
    const transaction = new BankTransaction({
      id: BankTransactionId.create(),
      workspaceId,
      connectionId,
      sessionId,
      externalId,
      amount,
      currency,
      description,
      merchantName,
      categoryName,
      transactionDate,
      postedDate,
      status: TransactionStatus.PENDING,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    transaction.addDomainEvent(
      new BankTransactionSyncedEvent(
        transaction.id.getValue(),
        transaction.workspaceId.getValue(),
        transaction.connectionId.getValue(),
        externalId,
        amount,
        currency
      )
    );

    return transaction;
  }

  static reconstitute(props: BankTransactionProps): BankTransaction {
    return new BankTransaction(props);
  }

  // Getters
  get id(): BankTransactionId {
    return this.props.id;
  }

  get workspaceId(): WorkspaceId {
    return this.props.workspaceId;
  }

  get connectionId(): BankConnectionId {
    return this.props.connectionId;
  }

  get sessionId(): SyncSessionId {
    return this.props.sessionId;
  }

  get externalId(): string {
    return this.props.externalId;
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  get description(): string {
    return this.props.description;
  }

  get merchantName(): string | undefined {
    return this.props.merchantName;
  }

  get categoryName(): string | undefined {
    return this.props.categoryName;
  }

  get transactionDate(): Date {
    return this.props.transactionDate;
  }

  get postedDate(): Date | undefined {
    return this.props.postedDate;
  }

  get status(): TransactionStatus {
    return this.props.status;
  }

  get expenseId(): string | undefined {
    return this.props.expenseId;
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
  markAsMatched(expenseId: string): void {
    this.props.status = TransactionStatus.MATCHED;
    this.props.expenseId = expenseId;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BankTransactionMatchedEvent(
        this.id.getValue(),
        this.workspaceId.getValue(),
        expenseId
      )
    );
  }

  markAsImported(expenseId: string): void {
    this.props.status = TransactionStatus.IMPORTED;
    this.props.expenseId = expenseId;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BankTransactionImportedEvent(
        this.id.getValue(),
        this.workspaceId.getValue(),
        expenseId
      )
    );
  }

  markAsIgnored(): void {
    this.props.status = TransactionStatus.IGNORED;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BankTransactionIgnoredEvent(
        this.id.getValue(),
        this.workspaceId.getValue()
      )
    );
  }

  markAsDuplicate(): void {
    this.props.status = TransactionStatus.DUPLICATE;
    this.props.updatedAt = new Date();
  }

  static toDTO(transaction: BankTransaction): BankTransactionDTO {
    return {
      id: transaction.id.getValue(),
      workspaceId: transaction.workspaceId.getValue(),
      connectionId: transaction.connectionId.getValue(),
      sessionId: transaction.sessionId.getValue(),
      externalId: transaction.externalId,
      amount: transaction.amount,
      currency: transaction.currency,
      description: transaction.description,
      merchantName: transaction.merchantName,
      categoryName: transaction.categoryName,
      transactionDate: transaction.transactionDate,
      postedDate: transaction.postedDate,
      status: transaction.status,
      expenseId: transaction.expenseId,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}

export interface BankTransactionDTO {
  id: string;
  workspaceId: string;
  connectionId: string;
  sessionId: string;
  externalId: string;
  amount: number;
  currency: string;
  description: string;
  merchantName?: string;
  categoryName?: string;
  transactionDate: Date;
  postedDate?: Date;
  status: string;
  expenseId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
