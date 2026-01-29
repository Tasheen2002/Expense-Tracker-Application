export class BudgetPlanningDomainError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;

  constructor(message: string, errorCode: string, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export class BudgetPlanNotFoundError extends BudgetPlanningDomainError {
  constructor(id: string) {
    super(`Budget plan with ID ${id} not found`, "BUDGET_PLAN_NOT_FOUND", 404);
  }
}

export class ForecastNotFoundError extends BudgetPlanningDomainError {
  constructor(id: string) {
    super(`Forecast with ID ${id} not found`, "FORECAST_NOT_FOUND", 404);
  }
}

export class ScenarioNotFoundError extends BudgetPlanningDomainError {
  constructor(id: string) {
    super(`Scenario with ID ${id} not found`, "SCENARIO_NOT_FOUND", 404);
  }
}

export class ForecastItemNotFoundError extends BudgetPlanningDomainError {
  constructor(id: string) {
    super(
      `Forecast item with ID ${id} not found`,
      "FORECAST_ITEM_NOT_FOUND",
      404,
    );
  }
}

export class DuplicateForecastNameError extends BudgetPlanningDomainError {
  constructor(name: string) {
    super(
      `Forecast with name '${name}' already exists in this plan`,
      "DUPLICATE_FORECAST_NAME",
      409,
    );
  }
}

export class DuplicateScenarioNameError extends BudgetPlanningDomainError {
  constructor(name: string) {
    super(
      `Scenario with name '${name}' already exists in this plan`,
      "DUPLICATE_SCENARIO_NAME",
      409,
    );
  }
}

export class DuplicateForecastItemError extends BudgetPlanningDomainError {
  constructor(categoryId: string) {
    super(
      `Forecast item for category '${categoryId}' already exists in this forecast`,
      "DUPLICATE_FORECAST_ITEM",
      409,
    );
  }
}

export class InvalidPlanPeriodError extends BudgetPlanningDomainError {
  constructor(message: string) {
    super(`Invalid plan period: ${message}`, "INVALID_PLAN_PERIOD", 400);
  }
}

export class UnauthorizedBudgetPlanAccessError extends BudgetPlanningDomainError {
  constructor(action: string) {
    super(
      `You are not authorized to ${action} this budget plan`,
      "UNAUTHORIZED_BUDGET_PLAN_ACCESS",
      403,
    );
  }
}
