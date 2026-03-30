export { registerBudgetPlanningRoutes } from './infrastructure/http/routes';

// Domain error types (used by cross-cutting error handlers)
export {
  BudgetPlanningDomainError,
  BudgetPlanNotFoundError,
  ForecastNotFoundError,
  ScenarioNotFoundError,
  ForecastItemNotFoundError,
  DuplicateForecastNameError,
  DuplicateScenarioNameError,
  DuplicateForecastItemError,
  InvalidPlanPeriodError,
  UnauthorizedBudgetPlanAccessError,
  InvalidForecastAmountError,
  ValidationError,
} from './domain/errors/budget-planning.errors';

// Domain enums (safe to share — value objects, not entities)
export { ForecastType } from './domain/enums/forecast-type.enum';
export { PlanStatus } from './domain/enums/plan-status.enum';
