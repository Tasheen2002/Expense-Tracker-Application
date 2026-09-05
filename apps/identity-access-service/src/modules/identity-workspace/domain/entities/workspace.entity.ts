import { WorkspaceId } from '../value-objects/workspace-id.vo';
import { UserId } from '../value-objects/user-id.vo';
import { InvalidWorkspaceNameError } from '../errors/identity.errors';
import {
  WORKSPACE_NAME_MAX_LENGTH,
  WORKSPACE_SLUG_MAX_LENGTH,
} from '../constants/identity.constants';
import { DomainEvent } from '@core/domain/events/domain-event';
import { AggregateRoot } from '@core/domain/aggregate-root';

// ============================================================================
// DTOs
// ============================================================================

export interface WorkspaceDTO {
  workspaceId: string;
  name: string;
  slug: string;
  ownerId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Domain Events
// ============================================================================

export class WorkspaceCreatedEvent extends DomainEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly ownerId: string
  ) {
    super(workspaceId, 'Workspace');
  }

  get eventType(): string {
    return 'WorkspaceCreated';
  }

  getPayload(): Record<string, unknown> {
    return {
      workspaceId: this.workspaceId,
      name: this.name,
      ownerId: this.ownerId,
    };
  }
}

export class WorkspaceRenamedEvent extends DomainEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly oldName: string,
    public readonly newName: string
  ) {
    super(workspaceId, 'Workspace');
  }

  get eventType(): string {
    return 'WorkspaceRenamed';
  }

  getPayload(): Record<string, unknown> {
    return {
      workspaceId: this.workspaceId,
      oldName: this.oldName,
      newName: this.newName,
    };
  }
}

export class WorkspaceDeactivatedEvent extends DomainEvent {
  constructor(public readonly workspaceId: string) {
    super(workspaceId, 'Workspace');
  }

  get eventType(): string {
    return 'WorkspaceDeactivated';
  }

  getPayload(): Record<string, unknown> {
    return { workspaceId: this.workspaceId };
  }
}

export class WorkspaceActivatedEvent extends DomainEvent {
  constructor(public readonly workspaceId: string) {
    super(workspaceId, 'Workspace');
  }

  get eventType(): string {
    return 'WorkspaceActivated';
  }

  getPayload(): Record<string, unknown> {
    return { workspaceId: this.workspaceId };
  }
}

export class WorkspaceDeletedEvent extends DomainEvent {
  constructor(public readonly workspaceId: string) {
    super(workspaceId, 'Workspace');
  }

  get eventType(): string {
    return 'WorkspaceDeleted';
  }

  getPayload(): Record<string, unknown> {
    return { workspaceId: this.workspaceId };
  }
}

export class WorkspaceOwnershipTransferredEvent extends DomainEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly previousOwnerId: string,
    public readonly ownerId: string
  ) {
    super(workspaceId, 'Workspace');
  }

  get eventType(): string {
    return 'WorkspaceOwnershipTransferred';
  }

  getPayload(): Record<string, unknown> {
    return {
      workspaceId: this.workspaceId,
      previousOwnerId: this.previousOwnerId,
      ownerId: this.ownerId,
    };
  }
}

// ============================================================================
// Entity Props
// ============================================================================

export interface WorkspaceProps {
  id: WorkspaceId;
  name: string;
  slug: string;
  ownerId: UserId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Aggregate Root
// ============================================================================

export class Workspace extends AggregateRoot {
  private constructor(private readonly props: WorkspaceProps) {
    super();
  }

  static create(data: CreateWorkspaceData): Workspace {
    const name = Workspace.validateName(data.name);
    const workspaceId = WorkspaceId.create();
    const ownerId = UserId.fromString(data.ownerId);
    const slug = Workspace.generateSlug(name);
    const now = new Date();

    const workspace = new Workspace({
      id: workspaceId,
      name,
      slug,
      ownerId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    workspace.addDomainEvent(
      new WorkspaceCreatedEvent(workspaceId.getValue(), name, data.ownerId)
    );

    return workspace;
  }

  static fromPersistence(data: WorkspaceData): Workspace {
    return new Workspace({
      id: data.id instanceof WorkspaceId ? data.id : WorkspaceId.fromString(data.id),
      name: data.name,
      slug: data.slug,
      ownerId: data.ownerId instanceof UserId ? data.ownerId : UserId.fromString(data.ownerId),
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  // Getters
  get id(): WorkspaceId {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get ownerId(): UserId {
    return this.props.ownerId;
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

  // Business logic methods
  updateName(newName: string): void {
    newName = Workspace.validateName(newName);

    const oldName = this.props.name;
    this.props.name = newName.trim();
    this.props.slug = Workspace.generateSlug(newName);
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new WorkspaceRenamedEvent(
        this.props.id.getValue(),
        oldName,
        this.props.name
      )
    );
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new WorkspaceDeactivatedEvent(this.props.id.getValue())
    );
  }

  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new WorkspaceActivatedEvent(this.props.id.getValue()));
  }

  isOwner(userId: UserId): boolean {
    return this.props.ownerId.equals(userId);
  }

  private static validateName(name: string): string {
    if (!name || !name.trim() || name.trim().length > WORKSPACE_NAME_MAX_LENGTH) {
      throw new InvalidWorkspaceNameError();
    }
    return name.trim();
  }

  transferOwnership(newOwnerId: string): void {
    const nextOwner = UserId.fromString(newOwnerId);
    const previousOwnerId = this.ownerId.getValue();
    this.props.ownerId = nextOwner;
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new WorkspaceOwnershipTransferredEvent(
        this.id.getValue(),
        previousOwnerId,
        newOwnerId
      )
    );
  }

  markAsDeleted(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new WorkspaceDeletedEvent(this.id.getValue()));
  }

  // Slug generation
  public static generateSlug(name: string): string {
    const slug = Workspace.validateName(name)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .slice(0, WORKSPACE_SLUG_MAX_LENGTH)
      .replace(/^-+|-+$/g, '');
    if (!slug) throw new InvalidWorkspaceNameError();
    return slug;
  }

  equals(other: Workspace): boolean {
    return this.props.id.equals(other.props.id);
  }

  toDTO(): WorkspaceDTO {
    return Workspace.toDTO(this);
  }

  static toDTO(workspace: Workspace): WorkspaceDTO {
    return {
      workspaceId: workspace.props.id.getValue(),
      name: workspace.props.name,
      slug: workspace.props.slug,
      ownerId: workspace.props.ownerId.getValue(),
      isActive: workspace.props.isActive,
      createdAt: workspace.props.createdAt.toISOString(),
      updatedAt: workspace.props.updatedAt.toISOString(),
    };
  }
}

// ============================================================================
// Supporting Types & Interfaces
// ============================================================================

export interface CreateWorkspaceData {
  name: string;
  ownerId: string;
}

export interface WorkspaceData {
  id: string | WorkspaceId;
  name: string;
  slug: string;
  ownerId: string | UserId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
