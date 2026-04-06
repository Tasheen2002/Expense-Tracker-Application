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
export { PeriodType } from './domain/enums/period-type.enum';
export { PlanStatus } from './domain/enums/plan-status.enum';

// DTO types (used by consumers to type API responses)
export type { BudgetPlanDTO } from './domain/entities/budget-plan.entity';
export type { ForecastDTO } from './domain/entities/forecast.entity';
export type { ForecastItemDTO } from './domain/entities/forecast-item.entity';
export type { ScenarioDTO } from './domain/entities/scenario.entity';

// Services
export { BudgetPlanService } from './application/services/budget-plan.service';
export { ForecastService } from './application/services/forecast.service';
export { ScenarioService } from './application/services/scenario.service';

// Command Handlers
export { CreateBudgetPlanHandler } from './application/commands/create-budget-plan.command';
export { UpdateBudgetPlanHandler } from './application/commands/update-budget-plan.command';
export { ActivateBudgetPlanHandler } from './application/commands/activate-budget-plan.command';
export { DeleteBudgetPlanHandler } from './application/commands/delete-budget-plan.command';
export { CreateForecastHandler } from './application/commands/create-forecast.command';
export { AddForecastItemHandler } from './application/commands/add-forecast-item.command';
export { DeleteForecastHandler, DeleteForecastItemHandler } from './application/commands/delete-forecast.command';
export { CreateScenarioHandler } from './application/commands/create-scenario.command';
export { UpdateScenarioHandler } from './application/commands/update-scenario.command';
export { DeleteScenarioHandler } from './application/commands/delete-scenario.command';

// Query Handlers
export { GetBudgetPlanHandler } from './application/queries/get-budget-plan.query';
export { ListBudgetPlansHandler } from './application/queries/list-budget-plans.query';
export { GetForecastHandler } from './application/queries/get-forecast.query';
export { ListForecastsHandler } from './application/queries/list-forecasts.query';
export { GetForecastItemsHandler } from './application/queries/get-forecast-items.query';
export { GetScenarioHandler } from './application/queries/get-scenario.query';
export { ListScenariosHandler } from './application/queries/list-scenarios.query';
