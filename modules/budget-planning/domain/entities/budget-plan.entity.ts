import { PlanId } from '../value-objects/plan-id';
import { WorkspaceId } from '../../../identity-workspace';
import { UserId } from '../../../identity-workspace';
import { PlanPeriod } from '../value-objects/plan-period';
import { PlanStatus } from '../enums/plan-status.enum';
import { PeriodType } from '../enums/period-type.enum';
import { DomainEvent } from '../../../../packages/core/src/domain/events/domain-event';
import { AggregateRoot } from '../../../../packages/core/src/domain/aggregate-root';

// ============================================================================
// Domain Events
// ============================================================================

export class BudgetPlanCreatedEvent extends DomainEvent {
  constructor(
    public readonly planId: string,
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly createdBy: string
  ) {
    super(planId, 'BudgetPlan');
  }

  get eventType(): string {
    return 'BudgetPlanCreated';
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
    public readonly newStatus: string
  ) {
    super(planId, 'BudgetPlan');
  }

  get eventType(): string {
    return 'BudgetPlanStatusChanged';
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
    public readonly name: string
  ) {
    super(planId, 'BudgetPlan');
  }

  get eventType(): string {
    return 'BudgetPlanUpdated';
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
    private readonly _id: PlanId,
    private readonly _workspaceId: WorkspaceId,
    private _name: string,
    private _description: string | null,
    private readonly _periodType: PeriodType,
    private readonly _period: PlanPeriod,
    private _status: PlanStatus,
    private readonly _createdBy: UserId,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {
    super();
  }

  static create(params: {
    workspaceId: WorkspaceId;
    name: string;
    description?: string | null;
    periodType: PeriodType;
    period: PlanPeriod;
    createdBy: UserId;
  }): BudgetPlan {
    const planId = PlanId.create();

    const plan = new BudgetPlan(
      planId,
      params.workspaceId,
      params.name,
      params.description || null,
      params.periodType,
      params.period,
      PlanStatus.DRAFT,
      params.createdBy,
      new Date(),
      new Date()
    );

    plan.addDomainEvent(
      new BudgetPlanCreatedEvent(
        planId.getValue(),
        params.workspaceId.getValue(),
        params.name,
        params.createdBy.getValue()
      )
    );

    return plan;
  }

  static reconstitute(params: {
    id: string;
    workspaceId: string;
    name: string;
    description: string | null;
    periodType: PeriodType;
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
      params.periodType,
      PlanPeriod.create(params.startDate, params.endDate),
      params.status,
      UserId.fromString(params.createdBy),
      params.createdAt,
      params.updatedAt
    );
  }

  get id(): PlanId {
    return this._id;
  }

  get workspaceId(): WorkspaceId {
    return this._workspaceId;
  }

  get name(): string {
    return this._name;
  }

  get description(): string | null {
    return this._description;
  }

  get periodType(): PeriodType {
    return this._periodType;
  }

  get period(): PlanPeriod {
    return this._period;
  }

  get status(): PlanStatus {
    return this._status;
  }

  get createdBy(): UserId {
    return this._createdBy;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  updateDetails(name?: string, description?: string | null): void {
    if (name) this._name = name;
    if (description !== undefined) this._description = description;
    this._updatedAt = new Date();

    this.addDomainEvent(
      new BudgetPlanUpdatedEvent(this._id.getValue(), this._name)
    );
  }

  updateStatus(status: PlanStatus): void {
    const oldStatus = this._status;
    this._status = status;
    this._updatedAt = new Date();

    this.addDomainEvent(
      new BudgetPlanStatusChangedEvent(this._id.getValue(), oldStatus, status)
    );
  }

  static toDTO(plan: BudgetPlan): BudgetPlanDTO {
    return {
      id: plan.id.getValue(),
      workspaceId: plan.workspaceId.getValue(),
      name: plan.name,
      description: plan.description,
      periodType: plan.periodType,
      period: {
        startDate: plan.period.startDate.toISOString(),
        endDate: plan.period.endDate.toISOString(),
      },
      status: plan.status,
      createdBy: plan.createdBy.getValue(),
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }
}

export interface BudgetPlanDTO {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  periodType: PeriodType;
  period: { startDate: string; endDate: string };
  status: PlanStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
