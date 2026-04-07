import { AggregateRoot } from '../../../../packages/core/src/domain/aggregate-root';
import { DomainEvent } from '../../../../packages/core/src/domain/events/domain-event';
import { SupplierId } from '../value-objects/supplier-id.vo';
import { InvalidInventoryDataError } from '../errors/inventory.errors';
import {
  SUPPLIER_NAME_MIN_LENGTH,
  SUPPLIER_NAME_MAX_LENGTH,
} from '../constants/inventory.constants';

// Domain Events
export class SupplierCreatedEvent extends DomainEvent {
  constructor(
    public readonly supplierId: string,
    public readonly workspaceId: string,
    public readonly name: string
  ) {
    super(supplierId, 'Supplier');
  }

  get eventType(): string { return 'supplier.created'; }

  getPayload(): Record<string, unknown> {
    return { supplierId: this.supplierId, workspaceId: this.workspaceId, name: this.name };
  }
}

export class SupplierUpdatedEvent extends DomainEvent {
  constructor(
    public readonly supplierId: string,
    public readonly workspaceId: string
  ) {
    super(supplierId, 'Supplier');
  }

  get eventType(): string { return 'supplier.updated'; }

  getPayload(): Record<string, unknown> {
    return { supplierId: this.supplierId, workspaceId: this.workspaceId };
  }
}

export interface SupplierProps {
  id: SupplierId;
  workspaceId: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSupplierData {
  workspaceId: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}

export interface SupplierDTO {
  supplierId: string;
  workspaceId: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class Supplier extends AggregateRoot {
  private constructor(private props: SupplierProps) {
    super();
  }

  static create(data: CreateSupplierData): Supplier {
    if (!data.name || data.name.trim().length < SUPPLIER_NAME_MIN_LENGTH) {
      throw new InvalidInventoryDataError('Supplier name is required');
    }
    if (data.name.length > SUPPLIER_NAME_MAX_LENGTH) {
      throw new InvalidInventoryDataError(
        `Supplier name cannot exceed ${SUPPLIER_NAME_MAX_LENGTH} characters`
      );
    }

    const now = new Date();
    const supplier = new Supplier({
      id: SupplierId.create(),
      workspaceId: data.workspaceId,
      name: data.name.trim(),
      contactEmail: data.contactEmail || null,
      contactPhone: data.contactPhone || null,
      address: data.address || null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    supplier.addDomainEvent(
      new SupplierCreatedEvent(
        supplier.id.getValue(),
        supplier.workspaceId,
        supplier.name
      )
    );

    return supplier;
  }

  static fromPersistence(props: SupplierProps): Supplier {
    return new Supplier(props);
  }

  updateName(name: string): void {
    if (!name || name.trim().length < SUPPLIER_NAME_MIN_LENGTH) {
      throw new InvalidInventoryDataError('Supplier name is required');
    }
    this.props.name = name.trim();
    this.props.updatedAt = new Date();
    this.addDomainEvent(new SupplierUpdatedEvent(this.id.getValue(), this.workspaceId));
  }

  updateContactEmail(email: string | null): void {
    this.props.contactEmail = email;
    this.props.updatedAt = new Date();
  }

  updateContactPhone(phone: string | null): void {
    this.props.contactPhone = phone;
    this.props.updatedAt = new Date();
  }

  updateAddress(address: string | null): void {
    this.props.address = address;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  get id(): SupplierId { return this.props.id; }
  get workspaceId(): string { return this.props.workspaceId; }
  get name(): string { return this.props.name; }
  get contactEmail(): string | null { return this.props.contactEmail; }
  get contactPhone(): string | null { return this.props.contactPhone; }
  get address(): string | null { return this.props.address; }
  get isActive(): boolean { return this.props.isActive; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  equals(other: Supplier): boolean {
    return this.props.id.equals(other.props.id);
  }

  static toDTO(supplier: Supplier): SupplierDTO {
    return {
      supplierId: supplier.id.getValue(),
      workspaceId: supplier.workspaceId,
      name: supplier.name,
      contactEmail: supplier.contactEmail,
      contactPhone: supplier.contactPhone,
      address: supplier.address,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt.toISOString(),
      updatedAt: supplier.updatedAt.toISOString(),
    };
  }
}
