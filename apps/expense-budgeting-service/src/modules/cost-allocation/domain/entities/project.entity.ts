import { ProjectId } from '../value-objects/project-id';
import { ProjectCode } from '../value-objects/project-code';
import { InvalidAllocationNameError, InvalidProjectError } from '../errors/cost-allocation.errors';
import Decimal from 'decimal.js';
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
    public readonly changes: Record<string, unknown>,
    public readonly workspaceId: string
  ) {
    super(projectId, 'Project');
  }

  get eventType(): string {
    return 'ProjectUpdated';
  }

  getPayload(): Record<string, unknown> {
    return {
      projectId: this.projectId,
      workspaceId: this.workspaceId,
      changes: this.changes,
    };
  }
}

export class ProjectActivatedEvent extends DomainEvent {
  constructor(public readonly projectId: string, public readonly workspaceId: string) {
    super(projectId, 'Project');
  }

  get eventType(): string {
    return 'ProjectActivated';
  }

  getPayload(): Record<string, unknown> {
    return { projectId: this.projectId, workspaceId: this.workspaceId };
  }
}

export class ProjectDeactivatedEvent extends DomainEvent {
  constructor(public readonly projectId: string, public readonly workspaceId: string) {
    super(projectId, 'Project');
  }

  get eventType(): string {
    return 'ProjectDeactivated';
  }

  getPayload(): Record<string, unknown> {
    return { projectId: this.projectId, workspaceId: this.workspaceId };
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
  version: number;
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
    Project.validateDetails(params.startDate, params.endDate ?? null, params.budget ?? null);
    const project = new Project({
      id: ProjectId.create(),
      workspaceId: params.workspaceId,
      name: Project.validName(params.name),
      code: ProjectCode.create(params.code).value,
      description: params.description || null,
      startDate: new Date(params.startDate),
      endDate: params.endDate ? new Date(params.endDate) : null,
      managerId: params.managerId || null,
      isActive: true,
      budget: params.budget ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    });

    project.addDomainEvent(
      new ProjectCreatedEvent(
        project.props.id.getValue(),
        params.workspaceId.getValue(),
        project.props.name,
        project.props.code,
        new Date(params.startDate)
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
    version?: number;
  }): Project {
    return new Project({
      id: ProjectId.fromString(params.id),
      workspaceId: WorkspaceId.fromString(params.workspaceId),
      name: params.name,
      code: params.code,
      description: params.description,
      startDate: new Date(params.startDate),
      endDate: params.endDate ? new Date(params.endDate) : null,
      managerId: params.managerId ? UserId.fromString(params.managerId) : null,
      isActive: params.isActive,
      budget: params.budget,
      createdAt: new Date(params.createdAt),
      updatedAt: new Date(params.updatedAt),
      version: params.version ?? 1,
    });
  }

  get id(): ProjectId { return this.props.id; }
  get workspaceId(): WorkspaceId { return this.props.workspaceId; }
  get name(): string { return this.props.name; }
  get code(): string { return this.props.code; }
  get description(): string | null { return this.props.description; }
  get startDate(): Date { return new Date(this.props.startDate); }
  get endDate(): Date | null { return this.props.endDate ? new Date(this.props.endDate) : null; }
  get managerId(): UserId | null { return this.props.managerId; }
  get isActive(): boolean { return this.props.isActive; }
  get budget(): number | null { return this.props.budget; }
  get createdAt(): Date { return new Date(this.props.createdAt); }
  get updatedAt(): Date { return new Date(this.props.updatedAt); }
  get version(): number { return this.props.version; }
  synchronizeVersion(version: number): void { this.props.version = version; }

  private static validName(name: string): string {
    const normalized = typeof name === 'string' ? name.trim() : '';
    if (normalized.length < 2 || normalized.length > 100) {
      throw new InvalidAllocationNameError('Project');
    }
    return normalized;
  }

  updateDetails(params: {
    name?: string;
    code?: string;
    description?: string | null;
    startDate?: Date;
    endDate?: Date | null;
    managerId?: UserId | null;
    budget?: number | null;
  }): void {
    const code = params.code === undefined ? undefined : ProjectCode.create(params.code).value;
    const name = params.name === undefined ? undefined : Project.validName(params.name);
    Project.validateDetails(
      params.startDate ?? this.props.startDate,
      params.endDate === undefined ? this.props.endDate : params.endDate,
      params.budget === undefined ? this.props.budget : params.budget,
    );
    const changes: Record<string, unknown> = {};
    if (name !== undefined) {
      this.props.name = name;
      changes.name = name;
    }
    if (code !== undefined) {
      this.props.code = code;
      changes.code = this.props.code;
    }
    if (params.description !== undefined) {
      this.props.description = params.description;
      changes.description = params.description;
    }
    if (params.startDate !== undefined) {
      this.props.startDate = new Date(params.startDate);
      changes.startDate = params.startDate.toISOString();
    }
    if (params.endDate !== undefined) {
      this.props.endDate = params.endDate ? new Date(params.endDate) : null;
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
    if (Object.keys(changes).length > 0) {
      this.props.updatedAt = new Date();
      this.addDomainEvent(new ProjectUpdatedEvent(this.props.id.getValue(), changes, this.props.workspaceId.getValue()));
    }
  }

  private static validateDetails(startDate: Date, endDate: Date | null, budget: number | null): void {
    if (!Number.isFinite(startDate.getTime()) || (endDate && !Number.isFinite(endDate.getTime()))) {
      throw new InvalidProjectError('dates must be valid');
    }
    if (endDate && endDate.getTime() < startDate.getTime()) {
      throw new InvalidProjectError('end date must not precede start date');
    }
    if (budget !== null && (!Number.isFinite(budget) || new Decimal(budget).lessThan(0) ||
        new Decimal(budget).decimalPlaces() > 2 || new Decimal(budget).greaterThan('9999999999.99'))) {
      throw new InvalidProjectError('budget must be a nonnegative amount with at most two decimal places');
    }
  }

  deactivate(): void {
    if (!this.props.isActive) return;
    this.props.isActive = false;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new ProjectDeactivatedEvent(this.props.id.getValue(), this.props.workspaceId.getValue()));
  }

  activate(): void {
    if (this.props.isActive) return;
    this.props.isActive = true;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new ProjectActivatedEvent(this.props.id.getValue(), this.props.workspaceId.getValue()));
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
