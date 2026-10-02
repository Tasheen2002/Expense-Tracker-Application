export const PLANNING_CONSTANTS = {
  MAX_FORECASTS_PER_PLAN: 10,
  MAX_ITEMS_PER_FORECAST: 100,
  MAX_SCENARIOS_PER_PLAN: 10,
  NAME_MIN_LENGTH: 1,
  PLAN_NAME_MAX_LENGTH: 100,
  FORECAST_NAME_MAX_LENGTH: 100,
  SCENARIO_NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  NOTES_MAX_LENGTH: 500,
  MIN_AMOUNT: 0,
  MAX_AMOUNT: 9999999999.99, // 10 billion - 0.01
  DEFAULT_PAGE_LIMIT: 20,
  MAX_PAGE_LIMIT: 100,
} as const;

export const BUDGET_PLAN_EVENTS = {
  PLAN_CREATED: 'budget_plan.created',
  PLAN_STATUS_CHANGED: 'budget_plan.status_changed',
  PLAN_UPDATED: 'budget_plan.updated',
  PLAN_DELETED: 'budget_plan.deleted',
  FORECAST_CREATED: 'budget_plan.forecast_created',
  FORECAST_UPDATED: 'budget_plan.forecast_updated',
  FORECAST_ACTIVATED: 'budget_plan.forecast_activated',
  FORECAST_DEACTIVATED: 'budget_plan.forecast_deactivated',
  FORECAST_DELETED: 'budget_plan.forecast_deleted',
  SCENARIO_CREATED: 'budget_plan.scenario_created',
  SCENARIO_UPDATED: 'budget_plan.scenario_updated',
  SCENARIO_DELETED: 'budget_plan.scenario_deleted',
  FORECAST_ITEM_CREATED: 'budget_plan.forecast_item_created',
  FORECAST_ITEM_UPDATED: 'budget_plan.forecast_item_updated',
  FORECAST_ITEM_DELETED: 'budget_plan.forecast_item_deleted',
} as const;

export type BudgetPlanEventType = (typeof BUDGET_PLAN_EVENTS)[keyof typeof BUDGET_PLAN_EVENTS];
