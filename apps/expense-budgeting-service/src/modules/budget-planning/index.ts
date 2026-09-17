// HTTP entry-point (used by the API app to mount routes)
export { registerBudgetPlanningRoutes } from './infrastructure/http/routes';

// Domain error types (used by cross-cutting error handlers)
// BudgetPlanningDomainError is intentionally omitted — it is a base class and internal implementation detail
export {
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
export { PeriodType } from './domain/enums/period-type.enum';
export { PlanStatus } from './domain/enums/plan-status.enum';

// DTO types (used by consumers to type API responses)
export type { BudgetPlanDTO } from './domain/entities/budget-plan.entity';
export type { ForecastDTO } from './domain/entities/forecast.entity';
export type { ForecastItemDTO } from './domain/entities/forecast-item.entity';
export type { ScenarioDTO } from './domain/entities/scenario.entity';
