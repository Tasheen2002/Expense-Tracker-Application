import { ProjectId } from '../value-objects/project-id';
import {  WorkspaceId, UserId  } from '@core/domain/value-objects';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';

export interface ProjectDTO {
  id: string;
  workspaceId: string;
  name: string;
  code: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  managerId: string | null;
  budget: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Domain Events
// ============================================================================

export class ProjectCreatedEvent extends DomainEvent {
  constructor(
    public readonly projectId: string,
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly code: string,
    public readonly startDate: Date
  ) {
    super(projectId, 'Project');
  }

  get eventType(): string {
    return 'ProjectCreated';
  }

  getPayload(): Record<string, unknown> {
    return {
      projectId: this.projectId,
      workspaceId: this.workspaceId,
      name: this.name,
      code: this.code,
      startDate: this.startDate.toISOString(),
    };
  }
}

export class ProjectUpdatedEvent extends DomainEvent {
  constructor(
    public readonly projectId: string,
    public readonly changes: Record<string, unknown>
  ) {
    super(projectId, 'Project');
  }

  get eventType(): string {
    return 'ProjectUpdated';
  }

  getPayload(): Record<string, unknown> {
    return {
      projectId: this.projectId,
      changes: this.changes,
    };
  }
}

export class ProjectActivatedEvent extends DomainEvent {
  constructor(public readonly projectId: string) {
    super(projectId, 'Project');
  }

  get eventType(): string {
    return 'ProjectActivated';
  }

  getPayload(): Record<string, unknown> {
    return { projectId: this.projectId };
  }
}

export class ProjectDeactivatedEvent extends DomainEvent {
  constructor(public readonly projectId: string) {
    super(projectId, 'Project');
  }

  get eventType(): string {
    return 'ProjectDeactivated';
  }

  getPayload(): Record<string, unknown> {
    return { projectId: this.projectId };
  }
}

export class ProjectDeletedEvent extends DomainEvent {
  constructor(
    public readonly projectId: string,
    public readonly workspaceId: string
  ) {
    super(projectId, 'Project');
  }

  get eventType(): string {
    return 'ProjectDeleted';
  }

  getPayload(): Record<string, unknown> {
    return {
      projectId: this.projectId,
      workspaceId: this.workspaceId,
    };
  }
}

// ============================================================================
// Entity
// ============================================================================

interface ProjectProps {
  id: ProjectId;
  workspaceId: WorkspaceId;
  name: string;
  code: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  managerId: UserId | null;
  isActive: boolean;
  budget: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Project extends AggregateRoot {
  private constructor(private props: ProjectProps) {
    super();
  }

  static create(params: {
    workspaceId: WorkspaceId;
    name: string;
    code: string;
    startDate: Date;
    description?: string | null;
    endDate?: Date | null;
    managerId?: UserId | null;
    budget?: number | null;
  }): Project {
    const project = new Project({
      id: ProjectId.create(),
      workspaceId: params.workspaceId,
      name: params.name,
      code: params.code,
      description: params.description || null,
      startDate: params.startDate,
      endDate: params.endDate || null,
      managerId: params.managerId || null,
      isActive: true,
      budget: params.budget ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    project.addDomainEvent(
      new ProjectCreatedEvent(
        project.props.id.getValue(),
        params.workspaceId.getValue(),
        params.name,
        params.code,
        params.startDate
      )
    );

    return project;
  }

  static fromPersistence(params: {
    id: string;
    workspaceId: string;
    name: string;
    code: string;
    description: string | null;
    startDate: Date;
    endDate: Date | null;
    managerId: string | null;
    isActive: boolean;
    budget: number | null;
    createdAt: Date;
    updatedAt: Date;
  }): Project {
    return new Project({
      id: ProjectId.fromString(params.id),
      workspaceId: WorkspaceId.fromString(params.workspaceId),
      name: params.name,
      code: params.code,
      description: params.description,
      startDate: params.startDate,
      endDate: params.endDate,
      managerId: params.managerId ? UserId.fromString(params.managerId) : null,
      isActive: params.isActive,
      budget: params.budget,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    });
  }

  get id(): ProjectId { return this.props.id; }
  get workspaceId(): WorkspaceId { return this.props.workspaceId; }
  get name(): string { return this.props.name; }
  get code(): string { return this.props.code; }
  get description(): string | null { return this.props.description; }
  get startDate(): Date { return this.props.startDate; }
  get endDate(): Date | null { return this.props.endDate; }
  get managerId(): UserId | null { return this.props.managerId; }
  get isActive(): boolean { return this.props.isActive; }
  get budget(): number | null { return this.props.budget; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  updateDetails(params: {
    name?: string;
    code?: string;
    description?: string | null;
    startDate?: Date;
    endDate?: Date | null;
    managerId?: UserId | null;
    budget?: number | null;
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
    if (params.startDate !== undefined) {
      this.props.startDate = params.startDate;
      changes.startDate = params.startDate.toISOString();
    }
    if (params.endDate !== undefined) {
      this.props.endDate = params.endDate;
      changes.endDate = params.endDate?.toISOString() ?? null;
    }
    if (params.managerId !== undefined) {
      this.props.managerId = params.managerId;
      changes.managerId = params.managerId?.getValue() ?? null;
    }
    if (params.budget !== undefined) {
      this.props.budget = params.budget;
      changes.budget = params.budget ?? null;
    }
    this.props.updatedAt = new Date();

    if (Object.keys(changes).length > 0) {
      this.addDomainEvent(new ProjectUpdatedEvent(this.props.id.getValue(), changes));
    }
  }

  deactivate(): void {
    if (!this.props.isActive) return;
    this.props.isActive = false;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new ProjectDeactivatedEvent(this.props.id.getValue()));
  }

  activate(): void {
    if (this.props.isActive) return;
    this.props.isActive = true;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new ProjectActivatedEvent(this.props.id.getValue()));
  }

  markAsDeleted(): void {
    this.addDomainEvent(
      new ProjectDeletedEvent(
        this.props.id.getValue(),
        this.props.workspaceId.getValue()
      )
    );
  }

  static toDTO(project: Project): ProjectDTO {
    return {
      id: project.props.id.getValue(),
      workspaceId: project.props.workspaceId.getValue(),
      name: project.props.name,
      code: project.props.code,
      description: project.props.description,
      startDate: project.props.startDate.toISOString(),
      endDate: project.props.endDate?.toISOString() ?? null,
      managerId: project.props.managerId?.getValue() ?? null,
      budget: project.props.budget,
      isActive: project.props.isActive,
      createdAt: project.props.createdAt.toISOString(),
      updatedAt: project.props.updatedAt.toISOString(),
    };
  }
}
