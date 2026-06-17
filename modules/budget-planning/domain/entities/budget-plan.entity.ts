import { PlanId } from '../value-objects/plan-id';
import { WorkspaceId } from '../../../identity-workspace';
import { UserId } from '../../../identity-workspace';
import { PlanPeriod } from '../value-objects/plan-period';
import { PlanStatus } from '../enums/plan-status.enum';
import { PeriodType } from '../enums/period-type.enum';
import { DomainEvent } from '@core/domain/events/domain-event';
import { AggregateRoot } from '@core/domain/aggregate-root';

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

interface BudgetPlanProps {
  id: PlanId;
  workspaceId: WorkspaceId;
  name: string;
  description: string | null;
  periodType: PeriodType;
  period: PlanPeriod;
  status: PlanStatus;
  createdBy: UserId;
  createdAt: Date;
  updatedAt: Date;
}

export class BudgetPlan extends AggregateRoot {
  private constructor(private props: BudgetPlanProps) {
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

    const plan = new BudgetPlan({
      id: planId,
      workspaceId: params.workspaceId,
      name: params.name,
      description: params.description || null,
      periodType: params.periodType,
      period: params.period,
      status: PlanStatus.DRAFT,
      createdBy: params.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

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

  static fromPersistence(params: {
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
    return new BudgetPlan({
      id: PlanId.fromString(params.id),
      workspaceId: WorkspaceId.fromString(params.workspaceId),
      name: params.name,
      description: params.description,
      periodType: params.periodType,
      period: PlanPeriod.create(params.startDate, params.endDate),
      status: params.status,
      createdBy: UserId.fromString(params.createdBy),
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    });
  }

  get id(): PlanId { return this.props.id; }
  get workspaceId(): WorkspaceId { return this.props.workspaceId; }
  get name(): string { return this.props.name; }
  get description(): string | null { return this.props.description; }
  get periodType(): PeriodType { return this.props.periodType; }
  get period(): PlanPeriod { return this.props.period; }
  get status(): PlanStatus { return this.props.status; }
  get createdBy(): UserId { return this.props.createdBy; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  updateDetails(name?: string, description?: string | null): void {
    if (name) this.props.name = name;
    if (description !== undefined) this.props.description = description;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BudgetPlanUpdatedEvent(this.props.id.getValue(), this.props.name, this.props.description)
    );
  }

  updateStatus(status: PlanStatus): void {
    const oldStatus = this.props.status;
    this.props.status = status;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BudgetPlanStatusChangedEvent(this.props.id.getValue(), oldStatus, status)
    );
  }

  markAsDeleted(): void {
    this.addDomainEvent(
      new BudgetPlanDeletedEvent(this.props.id.getValue(), this.props.workspaceId.getValue())
    );
  }

  recordForecastCreated(forecastId: string, name: string): void {
    this.addDomainEvent(
      new ForecastCreatedEvent(this.props.id.getValue(), forecastId, this.props.workspaceId.getValue(), name)
    );
  }

  recordForecastUpdated(forecastId: string): void {
    this.addDomainEvent(
      new ForecastUpdatedEvent(this.props.id.getValue(), forecastId, this.props.workspaceId.getValue())
    );
  }

  recordForecastActivated(forecastId: string): void {
    this.addDomainEvent(
      new ForecastActivatedEvent(this.props.id.getValue(), forecastId, this.props.workspaceId.getValue())
    );
  }

  recordForecastDeactivated(forecastId: string): void {
    this.addDomainEvent(
      new ForecastDeactivatedEvent(this.props.id.getValue(), forecastId, this.props.workspaceId.getValue())
    );
  }

  recordScenarioCreated(scenarioId: string, name: string): void {
    this.addDomainEvent(
      new ScenarioCreatedEvent(this.props.id.getValue(), scenarioId, this.props.workspaceId.getValue(), name)
    );
  }

  recordScenarioUpdated(scenarioId: string): void {
    this.addDomainEvent(
      new ScenarioUpdatedEvent(this.props.id.getValue(), scenarioId, this.props.workspaceId.getValue())
    );
  }

  recordForecastItemUpdated(forecastId: string, itemId: string): void {
    this.addDomainEvent(
      new ForecastItemUpdatedEvent(this.props.id.getValue(), forecastId, itemId, this.props.workspaceId.getValue())
    );
  }

  recordForecastItemDeleted(forecastId: string, itemId: string): void {
    this.addDomainEvent(
      new ForecastItemDeletedEvent(this.props.id.getValue(), forecastId, itemId, this.props.workspaceId.getValue())
    );
  }

  recordForecastDeleted(forecastId: string): void {
    this.addDomainEvent(
      new ForecastDeletedEvent(this.props.id.getValue(), forecastId, this.props.workspaceId.getValue())
    );
  }

  recordScenarioDeleted(scenarioId: string): void {
    this.addDomainEvent(
      new ScenarioDeletedEvent(this.props.id.getValue(), scenarioId, this.props.workspaceId.getValue())
    );
  }

  static toDTO(plan: BudgetPlan): BudgetPlanDTO {
    return {
      id: plan.props.id.getValue(),
      workspaceId: plan.props.workspaceId.getValue(),
      name: plan.props.name,
      description: plan.props.description,
      periodType: plan.props.periodType,
      period: {
        startDate: plan.props.period.startDate.toISOString(),
        endDate: plan.props.period.endDate.toISOString(),
      },
      status: plan.props.status,
      createdBy: plan.props.createdBy.getValue(),
      createdAt: plan.props.createdAt.toISOString(),
      updatedAt: plan.props.updatedAt.toISOString(),
    };
  }
}
