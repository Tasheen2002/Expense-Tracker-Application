import { DomainError } from '@core/domain/domain-error';

export class BudgetPlanningDomainError extends DomainError {
  constructor(message: string, code: string, statusCode: number) {
    super(message, code, statusCode);
  }
}

export class BudgetPlanNotFoundError extends BudgetPlanningDomainError {
  constructor(id: string, workspaceId?: string) {
    const message = workspaceId
      ? `Budget plan with ID ${id} not found in workspace ${workspaceId}`
      : `Budget plan with ID ${id} not found`;
    super(message, 'BUDGET_PLAN_NOT_FOUND', 404);
  }
}

export class ForecastNotFoundError extends BudgetPlanningDomainError {
  constructor(id: string, workspaceId?: string) {
    const message = workspaceId
      ? `Forecast with ID ${id} not found in workspace ${workspaceId}`
      : `Forecast with ID ${id} not found`;
    super(message, 'FORECAST_NOT_FOUND', 404);
  }
}

export class ScenarioNotFoundError extends BudgetPlanningDomainError {
  constructor(id: string, workspaceId?: string) {
    const message = workspaceId
      ? `Scenario with ID ${id} not found in workspace ${workspaceId}`
      : `Scenario with ID ${id} not found`;
    super(message, 'SCENARIO_NOT_FOUND', 404);
  }
}

export class ForecastItemNotFoundError extends BudgetPlanningDomainError {
  constructor(id: string, workspaceId?: string) {
    const message = workspaceId
      ? `Forecast item with ID ${id} not found in workspace ${workspaceId}`
      : `Forecast item with ID ${id} not found`;
    super(
      message,
      'FORECAST_ITEM_NOT_FOUND',
      404
    );
  }
}

export class DuplicateForecastNameError extends BudgetPlanningDomainError {
  constructor(name: string) {
    super(
      `Forecast with name '${name}' already exists in this plan`,
      'DUPLICATE_FORECAST_NAME',
      409
    );
  }
}

export class DuplicateScenarioNameError extends BudgetPlanningDomainError {
  constructor(name: string) {
    super(
      `Scenario with name '${name}' already exists in this plan`,
      'DUPLICATE_SCENARIO_NAME',
      409
    );
  }
}

export class DuplicateForecastItemError extends BudgetPlanningDomainError {
  constructor(categoryId: string) {
    super(
      `Forecast item for category '${categoryId}' already exists in this forecast`,
      'DUPLICATE_FORECAST_ITEM',
      409
    );
  }
}

export class InvalidPlanPeriodError extends BudgetPlanningDomainError {
  constructor(message: string) {
    super(`Invalid plan period: ${message}`, 'INVALID_PLAN_PERIOD', 400);
  }
}

export class UnauthorizedBudgetPlanAccessError extends BudgetPlanningDomainError {
  constructor(action: string) {
    super(
      `You are not authorized to ${action} this budget plan`,
      'UNAUTHORIZED_BUDGET_PLAN_ACCESS',
      403
    );
  }
}

export class InvalidForecastAmountError extends BudgetPlanningDomainError {
  constructor(message: string) {
    super(message, 'INVALID_FORECAST_AMOUNT', 400);
  }
}

export class InvalidPlanStatusTransitionError extends BudgetPlanningDomainError {
  constructor(planId: string, currentStatus: string, targetStatus: string) {
    super(
      `Cannot transition budget plan ${planId} from ${currentStatus} to ${targetStatus}`,
      'INVALID_PLAN_STATUS_TRANSITION',
      400
    );
  }
}

export class CannotDeleteActivePlanError extends BudgetPlanningDomainError {
  constructor(planId: string) {
    super(
      `Cannot delete budget plan ${planId} because it is active. Please archive it first.`,
      'CANNOT_DELETE_ACTIVE_PLAN',
      400
    );
  }
}

export class PlanNotModifiableError extends BudgetPlanningDomainError {
  constructor(planId: string, status: string, action: string = 'modify') {
    super(
      `Cannot ${action} budget plan ${planId} because it is in ${status} status`,
      'PLAN_NOT_MODIFIABLE',
      400
    );
  }
}

export class MaxScenariosExceededError extends BudgetPlanningDomainError {
  constructor(planId: string, max: number) {
    super(
      `Budget plan ${planId} cannot have more than ${max} scenarios`,
      'MAX_SCENARIOS_EXCEEDED',
      400
    );
  }
}

export class MaxForecastsExceededError extends BudgetPlanningDomainError {
  constructor(planId: string, max: number) {
    super(
      `Budget plan ${planId} cannot have more than ${max} forecasts`,
      'MAX_FORECASTS_EXCEEDED',
      400
    );
  }
}

export class MaxForecastItemsExceededError extends BudgetPlanningDomainError {
  constructor(forecastId: string, max: number) {
    super(
      `Forecast ${forecastId} cannot have more than ${max} items`,
      'MAX_FORECAST_ITEMS_EXCEEDED',
      400
    );
  }
}

export class ValidationError extends BudgetPlanningDomainError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class BudgetPlanConcurrencyConflictError extends BudgetPlanningDomainError {
  constructor(planId: string) {
    super(
      `Budget plan ${planId} was modified by another request. Please retry.`,
      'CONCURRENCY_CONFLICT',
      409
    );
  }
}

export const ConcurrencyConflictError = BudgetPlanConcurrencyConflictError;
export type ConcurrencyConflictError = BudgetPlanConcurrencyConflictError;
