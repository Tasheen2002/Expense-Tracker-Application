import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { BankConnectionId } from "../value-objects/bank-connection-id";
import { BankTransactionId } from "../value-objects/bank-transaction-id";
import { SyncSessionId } from "../value-objects/sync-session-id";
import { TransactionStatus } from "../enums/transaction-status.enum";

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

export class BankTransaction {
  private constructor(private readonly props: BankTransactionProps) {}

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
    metadata?: Record<string, unknown>,
  ): BankTransaction {
    return new BankTransaction({
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

  // Method-style getters for repository compatibility
  getId(): BankTransactionId {
    return this.props.id;
  }

  getWorkspaceId(): WorkspaceId {
    return this.props.workspaceId;
  }

  getConnectionId(): BankConnectionId {
    return this.props.connectionId;
  }

  getSessionId(): SyncSessionId {
    return this.props.sessionId;
  }

  getExternalId(): string {
    return this.props.externalId;
  }

  getAmount(): number {
    return this.props.amount;
  }

  getCurrency(): string {
    return this.props.currency;
  }

  getDescription(): string {
    return this.props.description;
  }

  getMerchantName(): string | undefined {
    return this.props.merchantName;
  }

  getCategoryName(): string | undefined {
    return this.props.categoryName;
  }

  getTransactionDate(): Date {
    return this.props.transactionDate;
  }

  getPostedDate(): Date | undefined {
    return this.props.postedDate;
  }

  getStatus(): TransactionStatus {
    return this.props.status;
  }

  getExpenseId(): string | undefined {
    return this.props.expenseId;
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
  markAsMatched(expenseId: string): void {
    this.props.status = TransactionStatus.MATCHED;
    this.props.expenseId = expenseId;
    this.props.updatedAt = new Date();
  }

  markAsImported(expenseId: string): void {
    this.props.status = TransactionStatus.IMPORTED;
    this.props.expenseId = expenseId;
    this.props.updatedAt = new Date();
  }

  markAsIgnored(): void {
    this.props.status = TransactionStatus.IGNORED;
    this.props.updatedAt = new Date();
  }

  markAsDuplicate(): void {
    this.props.status = TransactionStatus.DUPLICATE;
    this.props.updatedAt = new Date();
  }

  toPersistence(): BankTransactionProps {
    return { ...this.props };
  }
}
