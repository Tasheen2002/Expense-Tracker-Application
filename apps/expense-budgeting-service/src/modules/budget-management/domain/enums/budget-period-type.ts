import { InvalidBudgetPeriodError } from "../errors/budget.errors";

export enum BudgetPeriodType {
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
  YEARLY = "YEARLY",
  CUSTOM = "CUSTOM",
}

export const PERIOD_TYPE_DURATIONS: Record<BudgetPeriodType, number> = {
  [BudgetPeriodType.MONTHLY]: 30,
  [BudgetPeriodType.QUARTERLY]: 90,
  [BudgetPeriodType.YEARLY]: 365,
  [BudgetPeriodType.CUSTOM]: 0, // Variable duration
};

export function calculateEndDate(
  startDate: Date,
  periodType: BudgetPeriodType,
): Date {
  const endDate = new Date(startDate);

  switch (periodType) {
    case BudgetPeriodType.MONTHLY:
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case BudgetPeriodType.QUARTERLY:
      endDate.setMonth(endDate.getMonth() + 3);
      break;
    case BudgetPeriodType.YEARLY:
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;

    // ...
    case BudgetPeriodType.CUSTOM:
      throw new InvalidBudgetPeriodError(
        "Custom period requires explicit end date",
      );
  }

  return endDate;
}
