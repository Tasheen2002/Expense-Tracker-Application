import { WorkspaceId } from '../value-objects/workspace-id.vo';
import { UserId } from '../value-objects/user-id.vo';
import { InvalidWorkspaceNameError } from '../errors/identity.errors';
import { DomainEvent } from '../../../../packages/core/src/domain/events/domain-event';
import { AggregateRoot } from '../../../../packages/core/src/domain/aggregate-root';

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

// ============================================================================
// Entity
// ============================================================================

export class Workspace extends AggregateRoot {
  private constructor(
    private readonly id: WorkspaceId,
    private name: string,
    private slug: string,
    private readonly ownerId: UserId,
    private isActive: boolean,
    private readonly createdAt: Date,
    private updatedAt: Date
  ) {
    super();
  }

  static create(data: CreateWorkspaceData): Workspace {
    const workspaceId = WorkspaceId.create();
    const ownerId = UserId.fromString(data.ownerId);
    const slug = Workspace.generateSlug(data.name);
    const now = new Date();

    const workspace = new Workspace(
      workspaceId,
      data.name,
      slug,
      ownerId,
      true, // Active by default
      now,
      now
    );

    workspace.addDomainEvent(
      new WorkspaceCreatedEvent(workspaceId.getValue(), data.name, data.ownerId)
    );

    return workspace;
  }

  static reconstitute(data: WorkspaceData): Workspace {
    return new Workspace(
      WorkspaceId.fromString(data.id),
      data.name,
      data.slug,
      UserId.fromString(data.ownerId),
      data.isActive,
      data.createdAt,
      data.updatedAt
    );
  }

  // Getters
  getId(): WorkspaceId {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getSlug(): string {
    return this.slug;
  }

  getOwnerId(): UserId {
    return this.ownerId;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // Business logic methods
  updateName(newName: string): void {
    if (!newName || newName.trim().length === 0) {
      throw new InvalidWorkspaceNameError();
    }

    const oldName = this.name;
    this.name = newName.trim();
    this.slug = Workspace.generateSlug(newName);
    this.updatedAt = new Date();

    this.addDomainEvent(
      new WorkspaceRenamedEvent(this.id.getValue(), oldName, this.name)
    );
  }

  deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
    this.addDomainEvent(new WorkspaceDeactivatedEvent(this.id.getValue()));
  }

  activate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
    this.addDomainEvent(new WorkspaceActivatedEvent(this.id.getValue()));
  }

  isOwner(userId: UserId): boolean {
    return this.ownerId.equals(userId);
  }

  // Slug generation
  public static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  equals(other: Workspace): boolean {
    return this.id.equals(other.id);
  }

  static toDTO(workspace: Workspace): WorkspaceDTO {
    return {
      workspaceId: workspace.id.getValue(),
      name: workspace.name,
      slug: workspace.slug,
      ownerId: workspace.ownerId.getValue(),
      isActive: workspace.isActive,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
    };
  }
}

// Supporting types and interfaces
export interface CreateWorkspaceData {
  name: string;
  ownerId: string;
}

export interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceDTO {
  workspaceId: string;
  name: string;
  slug: string;
  ownerId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
