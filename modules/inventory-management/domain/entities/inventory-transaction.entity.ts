import { AggregateRoot } from '../../../../packages/core/src/domain/aggregate-root';
import { DomainEvent } from '../../../../packages/core/src/domain/events/domain-event';
import { InventoryTransactionId } from '../value-objects/inventory-transaction-id.vo';
import { TransactionType } from '../enums/transaction-type';
import { InvalidQuantityError } from '../errors/inventory.errors';

// Domain Events
export class InventoryTransactionCreatedEvent extends DomainEvent {
  constructor(
    public readonly transactionId: string,
    public readonly workspaceId: string,
    public readonly variantId: string,
    public readonly locationId: string,
    public readonly type: string,
    public readonly quantity: number
  ) {
    super(transactionId, 'InventoryTransaction');
  }

  get eventType(): string { return 'inventory_transaction.created'; }

  getPayload(): Record<string, unknown> {
    return {
      transactionId: this.transactionId,
      workspaceId: this.workspaceId,
      variantId: this.variantId,
      locationId: this.locationId,
      type: this.type,
      quantity: this.quantity,
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
    if (data.quantity <= 0) {
      throw new InvalidQuantityError('Transaction quantity must be greater than zero');
    }

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

    transaction.addDomainEvent(
      new InventoryTransactionCreatedEvent(
        transaction.id.getValue(),
        transaction.workspaceId,
        transaction.variantId,
        transaction.locationId,
        transaction.type,
        transaction.quantity
      )
    );

    return transaction;
  }

  static fromPersistence(props: InventoryTransactionProps): InventoryTransaction {
    return new InventoryTransaction(props);
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
  get createdAt(): Date { return this.props.createdAt; }

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
