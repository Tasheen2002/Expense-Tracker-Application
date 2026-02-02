import { ProjectId } from "../value-objects/project-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";
import { Decimal } from "@prisma/client/runtime/library";
import { AggregateRoot } from "../../../../apps/api/src/shared/domain/aggregate-root";
import { DomainEvent } from "../../../../apps/api/src/shared/domain/events/domain-event";

// ============================================================================
// Domain Events
// ============================================================================

export class ProjectCreatedEvent extends DomainEvent {
  constructor(
    public readonly projectId: string,
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly code: string,
    public readonly startDate: Date,
  ) {
    super(projectId, "Project");
  }

  get eventType(): string {
    return "ProjectCreated";
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
  ) {
    super(projectId, "Project");
  }

  get eventType(): string {
    return "ProjectUpdated";
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
    super(projectId, "Project");
  }

  get eventType(): string {
    return "ProjectActivated";
  }

  getPayload(): Record<string, unknown> {
    return { projectId: this.projectId };
  }
}

export class ProjectDeactivatedEvent extends DomainEvent {
  constructor(public readonly projectId: string) {
    super(projectId, "Project");
  }

  get eventType(): string {
    return "ProjectDeactivated";
  }

  getPayload(): Record<string, unknown> {
    return { projectId: this.projectId };
  }
}

// ============================================================================
// Entity
// ============================================================================

export class Project extends AggregateRoot {
  private constructor(
    private readonly id: ProjectId,
    private readonly workspaceId: WorkspaceId,
    private name: string,
    private code: string,
    private description: string | null,
    private startDate: Date,
    private endDate: Date | null,
    private managerId: UserId | null,
    private isActive: boolean,
    private budget: Decimal | null,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
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
    budget?: Decimal | null;
  }): Project {
    const project = new Project(
      ProjectId.create(),
      params.workspaceId,
      params.name,
      params.code,
      params.description || null,
      params.startDate,
      params.endDate || null,
      params.managerId || null,
      true,
      params.budget || null,
      new Date(),
      new Date(),
    );

    project.addDomainEvent(
      new ProjectCreatedEvent(
        project.id.getValue(),
        params.workspaceId.getValue(),
        params.name,
        params.code,
        params.startDate,
      ),
    );

    return project;
  }

  static reconstitute(params: {
    id: string;
    workspaceId: string;
    name: string;
    code: string;
    description: string | null;
    startDate: Date;
    endDate: Date | null;
    managerId: string | null;
    isActive: boolean;
    budget: Decimal | null;
    createdAt: Date;
    updatedAt: Date;
  }): Project {
    return new Project(
      ProjectId.fromString(params.id),
      WorkspaceId.fromString(params.workspaceId),
      params.name,
      params.code,
      params.description,
      params.startDate,
      params.endDate,
      params.managerId ? UserId.fromString(params.managerId) : null,
      params.isActive,
      params.budget,
      params.createdAt,
      params.updatedAt,
    );
  }

  getId(): ProjectId {
    return this.id;
  }

  getWorkspaceId(): WorkspaceId {
    return this.workspaceId;
  }

  getName(): string {
    return this.name;
  }

  getCode(): string {
    return this.code;
  }

  getDescription(): string | null {
    return this.description;
  }

  getStartDate(): Date {
    return this.startDate;
  }

  getEndDate(): Date | null {
    return this.endDate;
  }

  getManagerId(): UserId | null {
    return this.managerId;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  getBudget(): Decimal | null {
    return this.budget;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  updateDetails(params: {
    name?: string;
    code?: string;
    description?: string | null;
    startDate?: Date;
    endDate?: Date | null;
    managerId?: UserId | null;
    budget?: Decimal | null;
  }): void {
    const changes: Record<string, unknown> = {};
    if (params.name !== undefined) {
      this.name = params.name;
      changes.name = params.name;
    }
    if (params.code !== undefined) {
      this.code = params.code;
      changes.code = params.code;
    }
    if (params.description !== undefined) {
      this.description = params.description;
      changes.description = params.description;
    }
    if (params.startDate !== undefined) {
      this.startDate = params.startDate;
      changes.startDate = params.startDate.toISOString();
    }
    if (params.endDate !== undefined) {
      this.endDate = params.endDate;
      changes.endDate = params.endDate?.toISOString() ?? null;
    }
    if (params.managerId !== undefined) {
      this.managerId = params.managerId;
      changes.managerId = params.managerId?.getValue() ?? null;
    }
    if (params.budget !== undefined) {
      this.budget = params.budget;
      changes.budget = params.budget?.toString() ?? null;
    }
    this.updatedAt = new Date();

    if (Object.keys(changes).length > 0) {
      this.addDomainEvent(new ProjectUpdatedEvent(this.id.getValue(), changes));
    }
  }

  deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.updatedAt = new Date();
    this.addDomainEvent(new ProjectDeactivatedEvent(this.id.getValue()));
  }

  activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.updatedAt = new Date();
    this.addDomainEvent(new ProjectActivatedEvent(this.id.getValue()));
  }
}
