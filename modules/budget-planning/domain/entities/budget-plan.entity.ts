import { PlanId } from "../value-objects/plan-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";
import { PlanPeriod } from "../value-objects/plan-period";
import { PlanStatus } from "../enums/plan-status.enum";
import { DomainEvent } from "../../../../apps/api/src/shared/domain/events";
import { AggregateRoot } from "../../../../apps/api/src/shared/domain/aggregate-root";

// ============================================================================
// Domain Events
// ============================================================================

export class BudgetPlanCreatedEvent extends DomainEvent {
  constructor(
    public readonly planId: string,
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly createdBy: string,
  ) {
    super(planId, "BudgetPlan");
  }

  get eventType(): string {
    return "BudgetPlanCreated";
  }

  getPayload(): Record<string, unknown> {
    return {
      planId: this.planId,
      workspaceId: this.workspaceId,
      name: this.name,
      createdBy: this.createdBy,
    };
  }
}

export class BudgetPlanStatusChangedEvent extends DomainEvent {
  constructor(
    public readonly planId: string,
    public readonly oldStatus: string,
    public readonly newStatus: string,
  ) {
    super(planId, "BudgetPlan");
  }

  get eventType(): string {
    return "BudgetPlanStatusChanged";
  }

  getPayload(): Record<string, unknown> {
    return {
      planId: this.planId,
      oldStatus: this.oldStatus,
      newStatus: this.newStatus,
    };
  }
}

export class BudgetPlanUpdatedEvent extends DomainEvent {
  constructor(
    public readonly planId: string,
    public readonly name: string,
  ) {
    super(planId, "BudgetPlan");
  }

  get eventType(): string {
    return "BudgetPlanUpdated";
  }

  getPayload(): Record<string, unknown> {
    return {
      planId: this.planId,
      name: this.name,
    };
  }
}

// ============================================================================
// Entity
// ============================================================================

export class BudgetPlan extends AggregateRoot {
  private constructor(
    private readonly id: PlanId,
    private readonly workspaceId: WorkspaceId,
    private name: string,
    private description: string | null,
    private readonly period: PlanPeriod,
    private status: PlanStatus,
    private readonly createdBy: UserId,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    super();
  }

  static create(params: {
    workspaceId: WorkspaceId;
    name: string;
    description?: string | null;
    period: PlanPeriod;
    createdBy: UserId;
  }): BudgetPlan {
    const planId = PlanId.create();

    const plan = new BudgetPlan(
      planId,
      params.workspaceId,
      params.name,
      params.description || null,
      params.period,
      PlanStatus.DRAFT,
      params.createdBy,
      new Date(),
      new Date(),
    );

    plan.addDomainEvent(
      new BudgetPlanCreatedEvent(
        planId.getValue(),
        params.workspaceId.getValue(),
        params.name,
        params.createdBy.getValue(),
      ),
    );

    return plan;
  }

  static reconstitute(params: {
    id: string;
    workspaceId: string;
    name: string;
    description: string | null;
    startDate: Date;
    endDate: Date;
    status: PlanStatus;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }): BudgetPlan {
    return new BudgetPlan(
      PlanId.fromString(params.id),
      WorkspaceId.fromString(params.workspaceId),
      params.name,
      params.description,
      PlanPeriod.create(params.startDate, params.endDate),
      params.status,
      UserId.fromString(params.createdBy),
      params.createdAt,
      params.updatedAt,
    );
  }

  getId(): PlanId {
    return this.id;
  }

  getWorkspaceId(): WorkspaceId {
    return this.workspaceId;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string | null {
    return this.description;
  }

  getPeriod(): PlanPeriod {
    return this.period;
  }

  getStatus(): PlanStatus {
    return this.status;
  }

  getCreatedBy(): UserId {
    return this.createdBy;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  updateDetails(name?: string, description?: string | null): void {
    if (name) this.name = name;
    if (description !== undefined) this.description = description;
    this.updatedAt = new Date();

    this.addDomainEvent(
      new BudgetPlanUpdatedEvent(this.id.getValue(), this.name),
    );
  }

  updateStatus(status: PlanStatus): void {
    const oldStatus = this.status;
    this.status = status;
    this.updatedAt = new Date();

    this.addDomainEvent(
      new BudgetPlanStatusChangedEvent(this.id.getValue(), oldStatus, status),
    );
  }
}
