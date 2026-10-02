import { InventoryTransactionId } from '../value-objects/inventory-transaction-id.vo';
import { UuidId } from '@core/domain/value-objects/uuid-id.base';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';
import { TransactionType } from '../enums/transaction-type';
import { InvalidQuantityError, InvalidInventoryDataError } from '../errors/inventory.errors';
import { MAX_QUANTITY, NOTES_MAX_LENGTH, VARIANT_ID_MAX_LENGTH } from '../constants/inventory.constants';

export class InventoryTransactionRecordedEvent extends DomainEvent {
  constructor(
    public readonly transactionId: string,
    public readonly workspaceId: string,
    public readonly variantId: string,
    public readonly locationId: string,
    public readonly transactionType: TransactionType,
    public readonly quantity: number,
    public readonly referenceId: string | null
  ) {
    super(transactionId, 'InventoryTransaction');
  }

  get eventType(): string { return 'inventory_transaction.recorded'; }

  getPayload(): Record<string, unknown> {
    return {
      transactionId: this.transactionId,
      workspaceId: this.workspaceId,
      variantId: this.variantId,
      locationId: this.locationId,
      transactionType: this.transactionType,
      quantity: this.quantity,
      referenceId: this.referenceId,
    };
  }
}

export interface InventoryTransactionProps {
  id: InventoryTransactionId;
  workspaceId: string;
  variantId: string;
  locationId: string;
  type: TransactionType;
  quantity: number;
  referenceId: string | null;
  referenceType: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface CreateInventoryTransactionData {
  workspaceId: string;
  variantId: string;
  locationId: string;
  type: TransactionType;
  quantity: number;
  referenceId?: string;
  referenceType?: string;
  notes?: string;
  createdBy: string;
}

export interface InventoryTransactionDTO {
  transactionId: string;
  workspaceId: string;
  variantId: string;
  locationId: string;
  type: string;
  quantity: number;
  referenceId: string | null;
  referenceType: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

export class InventoryTransaction extends AggregateRoot {
  private constructor(private props: InventoryTransactionProps) {
    super();
  }

  static create(data: CreateInventoryTransactionData): InventoryTransaction {
    if (!UuidId.isValid(data.workspaceId) || !UuidId.isValid(data.locationId) || !UuidId.isValid(data.createdBy) ||
      (data.referenceId !== undefined && !UuidId.isValid(data.referenceId))) {
      throw new InvalidInventoryDataError('Invalid inventory transaction UUID');
    }
    const minimum = data.type === TransactionType.ADJUSTMENT ? 0 : 1;
    if (!Number.isSafeInteger(data.quantity) || data.quantity < minimum || data.quantity > MAX_QUANTITY) {
      throw new InvalidQuantityError('Transaction quantity is outside the allowed range');
    }
    if (!Object.values(TransactionType).includes(data.type)) throw new InvalidInventoryDataError('Invalid transaction type');
    if (data.type === TransactionType.TRANSFER) {
      throw new InvalidInventoryDataError('Transfer requires source and destination locations');
    }
    if (!data.variantId?.trim() || data.variantId.length > VARIANT_ID_MAX_LENGTH) throw new InvalidInventoryDataError('Invalid variant ID');
    if (data.notes && data.notes.length > NOTES_MAX_LENGTH) throw new InvalidInventoryDataError('Transaction notes are too long');
    if (data.referenceType && data.referenceType.length > 50) throw new InvalidInventoryDataError('Reference type is too long');

    const transaction = new InventoryTransaction({
      id: InventoryTransactionId.create(),
      workspaceId: data.workspaceId,
      variantId: data.variantId,
      locationId: data.locationId,
      type: data.type,
      quantity: data.quantity,
      referenceId: data.referenceId || null,
      referenceType: data.referenceType || null,
      notes: data.notes || null,
      createdBy: data.createdBy,
      createdAt: new Date(),
    });

    transaction.addDomainEvent(new InventoryTransactionRecordedEvent(
      transaction.id.getValue(), transaction.workspaceId, transaction.variantId,
      transaction.locationId, transaction.type, transaction.quantity, transaction.referenceId
    ));

    return transaction;
  }

  static fromPersistence(props: InventoryTransactionProps): InventoryTransaction {
    return new InventoryTransaction({ ...props, createdAt: new Date(props.createdAt) });
  }

  get id(): InventoryTransactionId { return this.props.id; }
  get workspaceId(): string { return this.props.workspaceId; }
  get variantId(): string { return this.props.variantId; }
  get locationId(): string { return this.props.locationId; }
  get type(): TransactionType { return this.props.type; }
  get quantity(): number { return this.props.quantity; }
  get referenceId(): string | null { return this.props.referenceId; }
  get referenceType(): string | null { return this.props.referenceType; }
  get notes(): string | null { return this.props.notes; }
  get createdBy(): string { return this.props.createdBy; }
  get createdAt(): Date { return new Date(this.props.createdAt); }

  static toDTO(tx: InventoryTransaction): InventoryTransactionDTO {
    return {
      transactionId: tx.id.getValue(),
      workspaceId: tx.workspaceId,
      variantId: tx.variantId,
      locationId: tx.locationId,
      type: tx.type,
      quantity: tx.quantity,
      referenceId: tx.referenceId,
      referenceType: tx.referenceType,
      notes: tx.notes,
      createdBy: tx.createdBy,
      createdAt: tx.createdAt.toISOString(),
    };
  }
}
