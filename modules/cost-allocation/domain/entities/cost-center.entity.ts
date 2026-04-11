import { CostCenterId } from '../value-objects/cost-center-id';
import { WorkspaceId } from '../../../identity-workspace';
import { AggregateRoot } from '../../../../packages/core/src/domain/aggregate-root';
import { DomainEvent } from '../../../../packages/core/src/domain/events/domain-event';

// ============================================================================
// Domain Events
// ============================================================================

export class CostCenterCreatedEvent extends DomainEvent {
  constructor(
    public readonly costCenterId: string,
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly code: string
  ) {
    super(costCenterId, 'CostCenter');
  }

  get eventType(): string {
    return 'CostCenterCreated';
  }

  getPayload(): Record<string, unknown> {
    return {
      costCenterId: this.costCenterId,
      workspaceId: this.workspaceId,
      name: this.name,
      code: this.code,
    };
  }
}

export class CostCenterUpdatedEvent extends DomainEvent {
  constructor(
    public readonly costCenterId: string,
    public readonly changes: Record<string, unknown>
  ) {
    super(costCenterId, 'CostCenter');
  }

  get eventType(): string {
    return 'CostCenterUpdated';
  }

  getPayload(): Record<string, unknown> {
    return {
      costCenterId: this.costCenterId,
      changes: this.changes,
    };
  }
}

export class CostCenterActivatedEvent extends DomainEvent {
  constructor(public readonly costCenterId: string) {
    super(costCenterId, 'CostCenter');
  }

  get eventType(): string {
    return 'CostCenterActivated';
  }

  getPayload(): Record<string, unknown> {
    return { costCenterId: this.costCenterId };
  }
}

export class CostCenterDeactivatedEvent extends DomainEvent {
  constructor(public readonly costCenterId: string) {
    super(costCenterId, 'CostCenter');
  }

  get eventType(): string {
    return 'CostCenterDeactivated';
  }

  getPayload(): Record<string, unknown> {
    return { costCenterId: this.costCenterId };
  }
}

export class CostCenterDeletedEvent extends DomainEvent {
  constructor(
    public readonly costCenterId: string,
    public readonly workspaceId: string
  ) {
    super(costCenterId, 'CostCenter');
  }

  get eventType(): string {
    return 'CostCenterDeleted';
  }

  getPayload(): Record<string, unknown> {
    return {
      costCenterId: this.costCenterId,
      workspaceId: this.workspaceId,
    };
  }
}

// ============================================================================
// Entity
// ============================================================================

interface CostCenterProps {
  id: CostCenterId;
  workspaceId: WorkspaceId;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class CostCenter extends AggregateRoot {
  private constructor(private props: CostCenterProps) {
    super();
  }

  static create(params: {
    workspaceId: WorkspaceId;
    name: string;
    code: string;
    description?: string | null;
  }): CostCenter {
    const costCenter = new CostCenter({
      id: CostCenterId.create(),
      workspaceId: params.workspaceId,
      name: params.name,
      code: params.code,
      description: params.description || null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    costCenter.addDomainEvent(
      new CostCenterCreatedEvent(
        costCenter.props.id.getValue(),
        params.workspaceId.getValue(),
        params.name,
        params.code
      )
    );

    return costCenter;
  }

  static fromPersistence(params: {
    id: string;
    workspaceId: string;
    name: string;
    code: string;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CostCenter {
    return new CostCenter({
      id: CostCenterId.fromString(params.id),
      workspaceId: WorkspaceId.fromString(params.workspaceId),
      name: params.name,
      code: params.code,
      description: params.description,
      isActive: params.isActive,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    });
  }

  get id(): CostCenterId { return this.props.id; }
  get workspaceId(): WorkspaceId { return this.props.workspaceId; }
  get name(): string { return this.props.name; }
  get code(): string { return this.props.code; }
  get description(): string | null { return this.props.description; }
  get isActive(): boolean { return this.props.isActive; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  updateDetails(params: {
    name?: string;
    code?: string;
    description?: string | null;
  }): void {
    const changes: Record<string, unknown> = {};
    if (params.name !== undefined) {
      this.props.name = params.name;
      changes.name = params.name;
    }
    if (params.code !== undefined) {
      this.props.code = params.code;
      changes.code = params.code;
    }
    if (params.description !== undefined) {
      this.props.description = params.description;
      changes.description = params.description;
    }
    this.props.updatedAt = new Date();

    if (Object.keys(changes).length > 0) {
      this.addDomainEvent(
        new CostCenterUpdatedEvent(this.props.id.getValue(), changes)
      );
    }
  }

  deactivate(): void {
    if (!this.props.isActive) return;
    this.props.isActive = false;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new CostCenterDeactivatedEvent(this.props.id.getValue()));
  }

  activate(): void {
    if (this.props.isActive) return;
    this.props.isActive = true;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new CostCenterActivatedEvent(this.props.id.getValue()));
  }

  markAsDeleted(): void {
    this.addDomainEvent(
      new CostCenterDeletedEvent(
        this.props.id.getValue(),
        this.props.workspaceId.getValue()
      )
    );
  }

  static toDTO(costCenter: CostCenter): CostCenterDTO {
    return {
      id: costCenter.props.id.getValue(),
      workspaceId: costCenter.props.workspaceId.getValue(),
      name: costCenter.props.name,
      code: costCenter.props.code,
      description: costCenter.props.description,
      isActive: costCenter.props.isActive,
      createdAt: costCenter.props.createdAt.toISOString(),
      updatedAt: costCenter.props.updatedAt.toISOString(),
    };
  }
}

export interface CostCenterDTO {
  id: string;
  workspaceId: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
