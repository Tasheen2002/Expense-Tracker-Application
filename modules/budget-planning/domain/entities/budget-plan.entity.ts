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
    public readonly name: string,
    public readonly description: string | null
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
      description: this.description,
    };
  }
}

export class BudgetPlanDeletedEvent extends DomainEvent {
  constructor(
    public readonly planId: string,
    public readonly workspaceId: string
  ) {
    super(planId, 'BudgetPlan');
  }

  get eventType(): string {
    return 'BudgetPlanDeleted';
  }

  getPayload(): Record<string, unknown> {
    return {
      planId: this.planId,
      workspaceId: this.workspaceId,
    };
  }
}

export class ForecastCreatedEvent extends DomainEvent {
  constructor(
    public readonly planId: string,
    public readonly forecastId: string,
    public readonly workspaceId: string,
    public readonly name: string
  ) {
    super(planId, 'BudgetPlan');
  }

  get eventType(): string {
    return 'budget_plan.forecast_created';
  }

  getPayload(): Record<string, unknown> {
    return {
      planId: this.planId,
      forecastId: this.forecastId,
      workspaceId: this.workspaceId,
      name: this.name,
    };
  }
}

export class ForecastUpdatedEvent extends DomainEvent {
  constructor(
    public readonly planId: string,
    public readonly forecastId: string,
    public readonly workspaceId: string
  ) {
    super(planId, 'BudgetPlan');
  }

  get eventType(): string {
    return 'budget_plan.forecast_updated';
  }

  getPayload(): Record<string, unknown> {
    return {
      planId: this.planId,
      forecastId: this.forecastId,
      workspaceId: this.workspaceId,
    };
  }
}

export class ForecastActivatedEvent extends DomainEvent {
  constructor(
    public readonly planId: string,
    public readonly forecastId: string,
    public readonly workspaceId: string
  ) {
    super(planId, 'BudgetPlan');
  }

  get eventType(): string {
    return 'budget_plan.forecast_activated';
  }

  getPayload(): Record<string, unknown> {
    return {
      planId: this.planId,
      forecastId: this.forecastId,
      workspaceId: this.workspaceId,
    };
  }
}

export class ForecastDeactivatedEvent extends DomainEvent {
  constructor(
    public readonly planId: string,
    public readonly forecastId: string,
    public readonly workspaceId: string
  ) {
    super(planId, 'BudgetPlan');
  }

  get eventType(): string {
    return 'budget_plan.forecast_deactivated';
  }

  getPayload(): Record<string, unknown> {
    return {
      planId: this.planId,
      forecastId: this.forecastId,
      workspaceId: this.workspaceId,
    };
  }
}

export class ScenarioCreatedEvent extends DomainEvent {
  constructor(
    public readonly planId: string,
    public readonly scenarioId: string,
    public readonly workspaceId: string,
    public readonly name: string
  ) {
    super(planId, 'BudgetPlan');
  }

  get eventType(): string {
    return 'budget_plan.scenario_created';
  }

  getPayload(): Record<string, unknown> {
    return {
      planId: this.planId,
      scenarioId: this.scenarioId,
      workspaceId: this.workspaceId,
      name: this.name,
    };
  }
}

export class ScenarioUpdatedEvent extends DomainEvent {
  constructor(
    public readonly planId: string,
    public readonly scenarioId: string,
    public readonly workspaceId: string
  ) {
    super(planId, 'BudgetPlan');
  }

  get eventType(): string {
    return 'budget_plan.scenario_updated';
  }

  getPayload(): Record<string, unknown> {
    return {
      planId: this.planId,
      scenarioId: this.scenarioId,
      workspaceId: this.workspaceId,
    };
  }
}

export class ForecastItemUpdatedEvent extends DomainEvent {
  constructor(
    public readonly planId: string,
    public readonly forecastId: string,
    public readonly itemId: string,
    public readonly workspaceId: string
  ) {
    super(planId, 'BudgetPlan');
  }

  get eventType(): string {
    return 'budget_plan.forecast_item_updated';
  }

  getPayload(): Record<string, unknown> {
    return {
      planId: this.planId,
      forecastId: this.forecastId,
      itemId: this.itemId,
      workspaceId: this.workspaceId,
    };
  }
}

export class ForecastItemDeletedEvent extends DomainEvent {
  constructor(
    public readonly planId: string,
    public readonly forecastId: string,
    public readonly itemId: string,
    public readonly workspaceId: string
  ) {
    super(planId, 'BudgetPlan');
  }

  get eventType(): string {
    return 'budget_plan.forecast_item_deleted';
  }

  getPayload(): Record<string, unknown> {
    return {
      planId: this.planId,
      forecastId: this.forecastId,
      itemId: this.itemId,
      workspaceId: this.workspaceId,
    };
  }
}

export class ForecastDeletedEvent extends DomainEvent {
  constructor(
    public readonly planId: string,
    public readonly forecastId: string,
    public readonly workspaceId: string
  ) {
    super(planId, 'BudgetPlan');
  }

  get eventType(): string {
    return 'budget_plan.forecast_deleted';
  }

  getPayload(): Record<string, unknown> {
    return {
      planId: this.planId,
      forecastId: this.forecastId,
      workspaceId: this.workspaceId,
    };
  }
}

export class ScenarioDeletedEvent extends DomainEvent {
  constructor(
    public readonly planId: string,
    public readonly scenarioId: string,
    public readonly workspaceId: string
  ) {
    super(planId, 'BudgetPlan');
  }

  get eventType(): string {
    return 'budget_plan.scenario_deleted';
  }

  getPayload(): Record<string, unknown> {
    return {
      planId: this.planId,
      scenarioId: this.scenarioId,
      workspaceId: this.workspaceId,
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
      new BudgetPlanUpdatedEvent(this._id.getValue(), this._name, this._description)
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

  markAsDeleted(): void {
    this.addDomainEvent(
      new BudgetPlanDeletedEvent(
        this._id.getValue(),
        this._workspaceId.getValue()
      )
    );
  }

  recordForecastCreated(forecastId: string, name: string): void {
    this.addDomainEvent(
      new ForecastCreatedEvent(
        this._id.getValue(),
        forecastId,
        this._workspaceId.getValue(),
        name
      )
    );
  }

  recordForecastUpdated(forecastId: string): void {
    this.addDomainEvent(
      new ForecastUpdatedEvent(
        this._id.getValue(),
        forecastId,
        this._workspaceId.getValue()
      )
    );
  }

  recordForecastActivated(forecastId: string): void {
    this.addDomainEvent(
      new ForecastActivatedEvent(
        this._id.getValue(),
        forecastId,
        this._workspaceId.getValue()
      )
    );
  }

  recordForecastDeactivated(forecastId: string): void {
    this.addDomainEvent(
      new ForecastDeactivatedEvent(
        this._id.getValue(),
        forecastId,
        this._workspaceId.getValue()
      )
    );
  }

  recordScenarioCreated(scenarioId: string, name: string): void {
    this.addDomainEvent(
      new ScenarioCreatedEvent(
        this._id.getValue(),
        scenarioId,
        this._workspaceId.getValue(),
        name
      )
    );
  }

  recordScenarioUpdated(scenarioId: string): void {
    this.addDomainEvent(
      new ScenarioUpdatedEvent(
        this._id.getValue(),
        scenarioId,
        this._workspaceId.getValue()
      )
    );
  }

  recordForecastItemUpdated(forecastId: string, itemId: string): void {
    this.addDomainEvent(
      new ForecastItemUpdatedEvent(
        this._id.getValue(),
        forecastId,
        itemId,
        this._workspaceId.getValue()
      )
    );
  }

  recordForecastItemDeleted(forecastId: string, itemId: string): void {
    this.addDomainEvent(
      new ForecastItemDeletedEvent(
        this._id.getValue(),
        forecastId,
        itemId,
        this._workspaceId.getValue()
      )
    );
  }

  recordForecastDeleted(forecastId: string): void {
    this.addDomainEvent(
      new ForecastDeletedEvent(
        this._id.getValue(),
        forecastId,
        this._workspaceId.getValue()
      )
    );
  }

  recordScenarioDeleted(scenarioId: string): void {
    this.addDomainEvent(
      new ScenarioDeletedEvent(
        this._id.getValue(),
        scenarioId,
        this._workspaceId.getValue()
      )
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
