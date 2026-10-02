import { PlanId } from '../value-objects/plan-id';
import {  WorkspaceId  } from '@core/domain/value-objects';
import {  UserId  } from '@core/domain/value-objects';
import { PlanPeriod } from '../value-objects/plan-period';
import { PlanStatus } from '../enums/plan-status.enum';
import { PeriodType } from '../enums/period-type.enum';
import { DomainEvent } from '@core/domain/events/domain-event';
import { AggregateRoot } from '@core/domain/aggregate-root';
import {
  InvalidPlanStatusTransitionError,
  PlanNotModifiableError,
  ValidationError,
  CannotDeleteActivePlanError,
  BudgetPlanConcurrencyConflictError,
  InvalidPlanPeriodError,
} from '../errors/budget-planning.errors';
import { PLANNING_CONSTANTS, BUDGET_PLAN_EVENTS } from '../constants/planning.constants';

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
    return BUDGET_PLAN_EVENTS.PLAN_CREATED;
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
    public readonly workspaceId: string,
    public readonly oldStatus: string,
    public readonly newStatus: string
  ) {
    super(planId, 'BudgetPlan');
  }

  get eventType(): string {
    return BUDGET_PLAN_EVENTS.PLAN_STATUS_CHANGED;
  }

  getPayload(): Record<string, unknown> {
    return {
      planId: this.planId,
      workspaceId: this.workspaceId,
      oldStatus: this.oldStatus,
      newStatus: this.newStatus,
    };
  }
}

export class BudgetPlanUpdatedEvent extends DomainEvent {
  constructor(
    public readonly planId: string,
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly description: string | null
  ) {
    super(planId, 'BudgetPlan');
  }

  get eventType(): string {
    return BUDGET_PLAN_EVENTS.PLAN_UPDATED;
  }

  getPayload(): Record<string, unknown> {
    return {
      planId: this.planId,
      workspaceId: this.workspaceId,
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
    return BUDGET_PLAN_EVENTS.PLAN_DELETED;
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
    return BUDGET_PLAN_EVENTS.FORECAST_CREATED;
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
    return BUDGET_PLAN_EVENTS.FORECAST_UPDATED;
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
    return BUDGET_PLAN_EVENTS.FORECAST_ACTIVATED;
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
    return BUDGET_PLAN_EVENTS.FORECAST_DEACTIVATED;
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
    return BUDGET_PLAN_EVENTS.SCENARIO_CREATED;
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
    return BUDGET_PLAN_EVENTS.SCENARIO_UPDATED;
  }

  getPayload(): Record<string, unknown> {
    return {
      planId: this.planId,
      scenarioId: this.scenarioId,
      workspaceId: this.workspaceId,
    };
  }
}

export class ForecastItemCreatedEvent extends DomainEvent {
  constructor(
    public readonly planId: string,
    public readonly forecastId: string,
    public readonly itemId: string,
    public readonly workspaceId: string
  ) {
    super(planId, 'BudgetPlan');
  }

  get eventType(): string {
    return BUDGET_PLAN_EVENTS.FORECAST_ITEM_CREATED;
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
    return BUDGET_PLAN_EVENTS.FORECAST_ITEM_UPDATED;
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
    return BUDGET_PLAN_EVENTS.FORECAST_ITEM_DELETED;
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
    return BUDGET_PLAN_EVENTS.FORECAST_DELETED;
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
    return BUDGET_PLAN_EVENTS.SCENARIO_DELETED;
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
  version: number;
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
    const trimmedName = params.name ? params.name.trim() : '';
    if (
      trimmedName.length < PLANNING_CONSTANTS.NAME_MIN_LENGTH ||
      trimmedName.length > PLANNING_CONSTANTS.PLAN_NAME_MAX_LENGTH
    ) {
      throw new ValidationError(
        `Plan name must be between ${PLANNING_CONSTANTS.NAME_MIN_LENGTH} and ${PLANNING_CONSTANTS.PLAN_NAME_MAX_LENGTH} characters`
      );
    }
    const trimmedDesc =
      params.description !== undefined && params.description !== null
        ? params.description.trim()
        : null;
    if (trimmedDesc && trimmedDesc.length > PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH) {
      throw new ValidationError(
        `Plan description cannot exceed ${PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH} characters`
      );
    }

    if (params.period.isIntraday()) {
      throw new InvalidPlanPeriodError(
        "Budget plan period cannot be intraday; start and end dates must fall on distinct calendar days"
      );
    }
    if (!params.period.isDateOnly()) {
      throw new InvalidPlanPeriodError(
        "Budget plan period must be date-only with time set to UTC midnight"
      );
    }

    const planId = PlanId.create();

    const plan = new BudgetPlan({
      id: planId,
      workspaceId: params.workspaceId,
      name: trimmedName,
      description: trimmedDesc || null,
      periodType: params.periodType,
      period: params.period,
      status: PlanStatus.DRAFT,
      createdBy: params.createdBy,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    plan.addDomainEvent(
      new BudgetPlanCreatedEvent(
        planId.getValue(),
        params.workspaceId.getValue(),
        trimmedName,
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
    version?: number;
    createdAt: Date;
    updatedAt: Date;
  }): BudgetPlan {
    return new BudgetPlan({
      id: PlanId.fromString(params.id),
      workspaceId: WorkspaceId.fromString(params.workspaceId),
      name: params.name,
      description: params.description,
      periodType: params.periodType,
      period: PlanPeriod.createDateOnly(params.startDate, params.endDate),
      status: params.status,
      createdBy: UserId.fromString(params.createdBy),
      version: params.version ?? 1,
      createdAt: new Date(params.createdAt.getTime()),
      updatedAt: new Date(params.updatedAt.getTime()),
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
  get version(): number { return this.props.version; }
  get createdAt(): Date { return new Date(this.props.createdAt.getTime()); }
  get updatedAt(): Date { return new Date(this.props.updatedAt.getTime()); }

  incrementVersion(): void {
    this.props.version += 1;
  }

  synchronizeVersion(newVersion: number): void {
    if (
      !Number.isInteger(newVersion) ||
      newVersion !== this.props.version + 1
    ) {
      throw new BudgetPlanConcurrencyConflictError(this.props.id.getValue());
    }
    this.props.version = newVersion;
  }

  private assertModifiable(action: string = 'modify'): void {
    if (this.props.status === PlanStatus.ARCHIVED) {
      throw new PlanNotModifiableError(this.props.id.getValue(), this.props.status, action);
    }
  }

  updateDetails(name?: string, description?: string | null): void {
    this.assertModifiable('update');
    let validatedName = this.props.name;
    let validatedDescription = this.props.description;

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (
        trimmedName.length < PLANNING_CONSTANTS.NAME_MIN_LENGTH ||
        trimmedName.length > PLANNING_CONSTANTS.PLAN_NAME_MAX_LENGTH
      ) {
        throw new ValidationError(
          `Plan name must be between ${PLANNING_CONSTANTS.NAME_MIN_LENGTH} and ${PLANNING_CONSTANTS.PLAN_NAME_MAX_LENGTH} characters`
        );
      }
      validatedName = trimmedName;
    }
    if (description !== undefined) {
      const trimmedDesc = description !== null ? description.trim() : null;
      if (trimmedDesc !== null && trimmedDesc.length > PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH) {
        throw new ValidationError(
          `Plan description cannot exceed ${PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH} characters`
        );
      }
      validatedDescription = trimmedDesc || null;
    }

    this.props.name = validatedName;
    this.props.description = validatedDescription;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BudgetPlanUpdatedEvent(this.props.id.getValue(), this.props.workspaceId.getValue(), this.props.name, this.props.description)
    );
  }

  private static readonly VALID_STATUS_TRANSITIONS: Record<PlanStatus, ReadonlySet<PlanStatus>> = {
    [PlanStatus.DRAFT]: new Set([PlanStatus.ACTIVE, PlanStatus.ARCHIVED]),
    [PlanStatus.ACTIVE]: new Set([PlanStatus.COMPLETED, PlanStatus.ARCHIVED]),
    [PlanStatus.COMPLETED]: new Set([PlanStatus.ARCHIVED, PlanStatus.ACTIVE]),
    [PlanStatus.ARCHIVED]: new Set([]), // Terminal state
  };

  updateStatus(status: PlanStatus): void {
    const oldStatus = this.props.status;
    if (oldStatus === status) {
      return;
    }

    const allowed = BudgetPlan.VALID_STATUS_TRANSITIONS[oldStatus];
    if (!allowed || !allowed.has(status)) {
      throw new InvalidPlanStatusTransitionError(
        this.props.id.getValue(),
        oldStatus,
        status
      );
    }

    this.props.status = status;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BudgetPlanStatusChangedEvent(this.props.id.getValue(), this.props.workspaceId.getValue(), oldStatus, status)
    );
  }

  markAsDeleted(): void {
    if (this.props.status === PlanStatus.ACTIVE) {
      throw new CannotDeleteActivePlanError(this.props.id.getValue());
    }
    this.addDomainEvent(
      new BudgetPlanDeletedEvent(this.props.id.getValue(), this.props.workspaceId.getValue())
    );
  }

  recordForecastCreated(forecastId: string, name: string): void {
    this.assertModifiable('add forecasts to');
    this.addDomainEvent(
      new ForecastCreatedEvent(this.props.id.getValue(), forecastId, this.props.workspaceId.getValue(), name)
    );
  }

  recordForecastUpdated(forecastId: string): void {
    this.assertModifiable('update forecasts in');
    this.addDomainEvent(
      new ForecastUpdatedEvent(this.props.id.getValue(), forecastId, this.props.workspaceId.getValue())
    );
  }

  recordForecastActivated(forecastId: string): void {
    this.assertModifiable('activate forecasts in');
    this.addDomainEvent(
      new ForecastActivatedEvent(this.props.id.getValue(), forecastId, this.props.workspaceId.getValue())
    );
  }

  recordForecastDeactivated(forecastId: string): void {
    this.assertModifiable('deactivate forecasts in');
    this.addDomainEvent(
      new ForecastDeactivatedEvent(this.props.id.getValue(), forecastId, this.props.workspaceId.getValue())
    );
  }

  recordScenarioCreated(scenarioId: string, name: string): void {
    this.assertModifiable('add scenarios to');
    this.addDomainEvent(
      new ScenarioCreatedEvent(this.props.id.getValue(), scenarioId, this.props.workspaceId.getValue(), name)
    );
  }

  recordScenarioUpdated(scenarioId: string): void {
    this.assertModifiable('update scenarios in');
    this.addDomainEvent(
      new ScenarioUpdatedEvent(this.props.id.getValue(), scenarioId, this.props.workspaceId.getValue())
    );
  }

  recordForecastItemCreated(forecastId: string, itemId: string): void {
    this.assertModifiable('add forecast items to');
    this.addDomainEvent(
      new ForecastItemCreatedEvent(this.props.id.getValue(), forecastId, itemId, this.props.workspaceId.getValue())
    );
  }

  recordForecastItemUpdated(forecastId: string, itemId: string): void {
    this.assertModifiable('modify forecast items in');
    this.addDomainEvent(
      new ForecastItemUpdatedEvent(this.props.id.getValue(), forecastId, itemId, this.props.workspaceId.getValue())
    );
  }

  recordForecastItemDeleted(forecastId: string, itemId: string): void {
    this.assertModifiable('delete forecast items in');
    this.addDomainEvent(
      new ForecastItemDeletedEvent(this.props.id.getValue(), forecastId, itemId, this.props.workspaceId.getValue())
    );
  }

  recordForecastDeleted(forecastId: string): void {
    this.assertModifiable('delete forecasts in');
    this.addDomainEvent(
      new ForecastDeletedEvent(this.props.id.getValue(), forecastId, this.props.workspaceId.getValue())
    );
  }

  recordScenarioDeleted(scenarioId: string): void {
    this.assertModifiable('delete scenarios in');
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
