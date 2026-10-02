import {  WorkspaceId  } from '@core/domain/value-objects';
import { BankConnectionId } from '../value-objects/bank-connection-id';
import { BankTransactionId } from '../value-objects/bank-transaction-id';
import { SyncSessionId } from '../value-objects/sync-session-id';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { DomainEvent } from '@core/domain/events/domain-event';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { BankFeedSyncDomainError } from '../errors/bank-feed-sync.errors';
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

// ============================================================================
// Domain Events
// ============================================================================

export class BankTransactionSyncedEvent extends DomainEvent {
  constructor(
    public readonly transactionId: string,
    public readonly workspaceId: string,
    public readonly connectionId: string,
    public readonly externalId: string,
    public readonly amount: string,
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

export class BankTransactionDuplicateDetectedEvent extends DomainEvent {
  constructor(
    public readonly transactionId: string,
    public readonly workspaceId: string,
    public readonly externalId: string
  ) {
    super(transactionId, 'BankTransaction');
  }

  get eventType(): string {
    return 'BankTransactionDuplicateDetected';
  }

  getPayload(): Record<string, unknown> {
    return {
      transactionId: this.transactionId,
      workspaceId: this.workspaceId,
      externalId: this.externalId,
    };
  }
}

export interface BankTransactionDTO {
  id: string;
  workspaceId: string;
  connectionId: string;
  sessionId: string;
  externalId: string;
  amount: string;
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

export interface BankTransactionProps {
  id: BankTransactionId;
  workspaceId: WorkspaceId;
  connectionId: BankConnectionId;
  sessionId: SyncSessionId;
  externalId: string;
  amount: string;
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
    this.props = { ...props,
      transactionDate: props.transactionDate ? new Date(props.transactionDate) : props.transactionDate,
      postedDate: props.postedDate ? new Date(props.postedDate) : props.postedDate,
      createdAt: props.createdAt ? new Date(props.createdAt) : props.createdAt,
      updatedAt: props.updatedAt ? new Date(props.updatedAt) : props.updatedAt,
      metadata: props.metadata ? structuredClone(props.metadata) : undefined,
    };
  }

  static create(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId,
    sessionId: SyncSessionId,
    externalId: string,
    amount: string | number,
    currency: string,
    description: string,
    transactionDate: Date,
    merchantName?: string,
    categoryName?: string,
    postedDate?: Date,
    metadata?: Record<string, unknown>
  ): BankTransaction {
    const decimalAmount = amount.toString();
    if ((typeof amount === 'number' && !Number.isFinite(amount)) ||
        !/^-?\d{1,14}(?:\.\d{1,6})?$/.test(decimalAmount)) {
      throw new BankFeedSyncDomainError(
        'Transaction amount must be finite with at most six decimal places',
        'INVALID_BANK_TRANSACTION_AMOUNT',
        422
      );
    }
    if (!externalId.trim() || !description.trim() || !/^[A-Z]{3}$/.test(currency) ||
        Number.isNaN(transactionDate.getTime()) ||
        (postedDate && Number.isNaN(postedDate.getTime()))) {
      throw new BankFeedSyncDomainError('Invalid bank transaction details', 'INVALID_BANK_TRANSACTION', 422);
    }
    const transaction = new BankTransaction({
      id: BankTransactionId.create(),
      workspaceId,
      connectionId,
      sessionId,
      externalId,
      amount: decimalAmount,
      currency,
      description,
      merchantName,
      categoryName,
      transactionDate: new Date(transactionDate),
      postedDate: postedDate ? new Date(postedDate) : undefined,
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
        decimalAmount,
        currency
      )
    );

    return transaction;
  }

  static fromPersistence(props: BankTransactionProps): BankTransaction {
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

  get amount(): string {
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
    return new Date(this.props.transactionDate);
  }

  get postedDate(): Date | undefined {
    return this.props.postedDate ? new Date(this.props.postedDate) : undefined;
  }

  get status(): TransactionStatus {
    return this.props.status;
  }

  get expenseId(): string | undefined {
    return this.props.expenseId;
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
  markAsMatched(expenseId: string): void {
    this.requirePending();
    this.validateExpenseId(expenseId);
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
    this.requirePending();
    this.validateExpenseId(expenseId);
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
    this.requirePending();
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
    this.requirePending();
    this.props.status = TransactionStatus.DUPLICATE;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BankTransactionDuplicateDetectedEvent(
        this.id.getValue(),
        this.workspaceId.getValue(),
        this.externalId
      )
    );
  }

  private requirePending(): void {
    if (this.props.status !== TransactionStatus.PENDING) {
      throw new BankFeedSyncDomainError(
        `Transaction is already ${this.props.status}`,
        'INVALID_TRANSACTION_TRANSITION',
        409
      );
    }
  }

  private validateExpenseId(expenseId: string): void {
    if (!UuidId.isValid(expenseId)) {
      throw new BankFeedSyncDomainError('Valid expense ID is required', 'INVALID_EXPENSE_ID', 422);
    }
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
