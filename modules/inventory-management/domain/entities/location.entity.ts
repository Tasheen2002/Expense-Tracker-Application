import { AggregateRoot } from '../../../../packages/core/src/domain/aggregate-root';
import { DomainEvent } from '../../../../packages/core/src/domain/events/domain-event';
import { LocationId } from '../value-objects/location-id.vo';
import { LocationType } from '../enums/location-type';
import { InvalidInventoryDataError } from '../errors/inventory.errors';
import {
  LOCATION_NAME_MIN_LENGTH,
  LOCATION_NAME_MAX_LENGTH,
} from '../constants/inventory.constants';

// Domain Events
export class LocationCreatedEvent extends DomainEvent {
  constructor(
    public readonly locationId: string,
    public readonly workspaceId: string,
    public readonly name: string
  ) {
    super(locationId, 'Location');
  }

  get eventType(): string { return 'location.created'; }

  getPayload(): Record<string, unknown> {
    return { locationId: this.locationId, workspaceId: this.workspaceId, name: this.name };
  }
}

export class LocationUpdatedEvent extends DomainEvent {
  constructor(
    public readonly locationId: string,
    public readonly workspaceId: string
  ) {
    super(locationId, 'Location');
  }

  get eventType(): string { return 'location.updated'; }

  getPayload(): Record<string, unknown> {
    return { locationId: this.locationId, workspaceId: this.workspaceId };
  }
}

export class LocationDeactivatedEvent extends DomainEvent {
  constructor(
    public readonly locationId: string,
    public readonly workspaceId: string
  ) {
    super(locationId, 'Location');
  }

  get eventType(): string { return 'location.deactivated'; }

  getPayload(): Record<string, unknown> {
    return { locationId: this.locationId, workspaceId: this.workspaceId };
  }
}

export class LocationActivatedEvent extends DomainEvent {
  constructor(
    public readonly locationId: string,
    public readonly workspaceId: string
  ) {
    super(locationId, 'Location');
  }

  get eventType(): string { return 'location.activated'; }

  getPayload(): Record<string, unknown> {
    return { locationId: this.locationId, workspaceId: this.workspaceId };
  }
}

export class LocationDeletedEvent extends DomainEvent {
  constructor(
    public readonly locationId: string,
    public readonly workspaceId: string
  ) {
    super(locationId, 'Location');
  }

  get eventType(): string { return 'location.deleted'; }

  getPayload(): Record<string, unknown> {
    return { locationId: this.locationId, workspaceId: this.workspaceId };
  }
}

export interface LocationProps {
  id: LocationId;
  workspaceId: string;
  name: string;
  type: LocationType;
  address: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLocationData {
  workspaceId: string;
  name: string;
  type?: LocationType;
  address?: string;
}

export interface LocationDTO {
  locationId: string;
  workspaceId: string;
  name: string;
  type: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class Location extends AggregateRoot {
  private constructor(private props: LocationProps) {
    super();
  }

  static create(data: CreateLocationData): Location {
    if (!data.name || data.name.trim().length < LOCATION_NAME_MIN_LENGTH) {
      throw new InvalidInventoryDataError('Location name is required');
    }
    if (data.name.length > LOCATION_NAME_MAX_LENGTH) {
      throw new InvalidInventoryDataError(
        `Location name cannot exceed ${LOCATION_NAME_MAX_LENGTH} characters`
      );
    }

    const now = new Date();
    const location = new Location({
      id: LocationId.create(),
      workspaceId: data.workspaceId,
      name: data.name.trim(),
      type: data.type || LocationType.WAREHOUSE,
      address: data.address || null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    location.addDomainEvent(
      new LocationCreatedEvent(
        location.id.getValue(),
        location.workspaceId,
        location.name
      )
    );

    return location;
  }

  static fromPersistence(props: LocationProps): Location {
    return new Location(props);
  }

  updateName(name: string): void {
    if (!name || name.trim().length < LOCATION_NAME_MIN_LENGTH) {
      throw new InvalidInventoryDataError('Location name is required');
    }
    this.props.name = name.trim();
    this.props.updatedAt = new Date();
    this.addDomainEvent(new LocationUpdatedEvent(this.id.getValue(), this.workspaceId));
  }

  updateType(type: LocationType): void {
    this.props.type = type;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new LocationUpdatedEvent(this.id.getValue(), this.workspaceId));
  }

  updateAddress(address: string | null): void {
    this.props.address = address;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new LocationUpdatedEvent(this.id.getValue(), this.workspaceId));
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new LocationDeactivatedEvent(this.id.getValue(), this.workspaceId));
  }

  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new LocationActivatedEvent(this.id.getValue(), this.workspaceId));
  }

  markAsDeleted(): void {
    this.addDomainEvent(
      new LocationDeletedEvent(this.id.getValue(), this.workspaceId)
    );
  }

  get id(): LocationId {
    return this.props.id;
  }
  get workspaceId(): string {
    return this.props.workspaceId;
  }
  get name(): string {
    return this.props.name;
  }
  get type(): LocationType {
    return this.props.type;
  }
  get address(): string | null {
    return this.props.address;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  equals(other: Location): boolean {
    return this.props.id.equals(other.props.id);
  }

  static toDTO(location: Location): LocationDTO {
    return {
      locationId: location.id.getValue(),
      workspaceId: location.workspaceId,
      name: location.name,
      type: location.type,
      address: location.address,
      isActive: location.isActive,
      createdAt: location.createdAt.toISOString(),
      updatedAt: location.updatedAt.toISOString(),
    };
  }
}
