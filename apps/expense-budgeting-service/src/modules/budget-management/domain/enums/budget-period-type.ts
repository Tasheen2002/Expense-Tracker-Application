import { InvalidBudgetPeriodError } from "../errors/budget.errors";

export enum BudgetPeriodType {
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
  YEARLY = "YEARLY",
  CUSTOM = "CUSTOM",
}

export function calculateEndDate(
  startDate: Date,
  periodType: BudgetPeriodType,
): Date {
  if (!(startDate instanceof Date) || !Number.isFinite(startDate.getTime())) {
    throw new InvalidBudgetPeriodError("Start date must be valid");
  }

  const endDate = new Date(startDate.getTime());

  switch (periodType) {
    case BudgetPeriodType.MONTHLY: {
      const expectedMonth = (endDate.getUTCMonth() + 1) % 12;
      endDate.setUTCMonth(endDate.getUTCMonth() + 1);
      if (endDate.getUTCMonth() !== expectedMonth) {
        endDate.setUTCDate(0);
      }
      break;
    }
    case BudgetPeriodType.QUARTERLY: {
      const expectedMonth = (endDate.getUTCMonth() + 3) % 12;
      endDate.setUTCMonth(endDate.getUTCMonth() + 3);
      if (endDate.getUTCMonth() !== expectedMonth) {
        endDate.setUTCDate(0);
      }
      break;
    }
    case BudgetPeriodType.YEARLY: {
      const targetYear = endDate.getUTCFullYear() + 1;
      endDate.setUTCFullYear(targetYear);
      if (endDate.getUTCMonth() !== startDate.getUTCMonth()) {
        endDate.setUTCDate(0);
      }
      break;
    }
    case BudgetPeriodType.CUSTOM:
      throw new InvalidBudgetPeriodError(
        "Custom period requires explicit end date",
      );
    default:
      throw new InvalidBudgetPeriodError("Unsupported budget period type");
  }

  // Period end dates are inclusive. When the anniversary exists, the prior day
  // closes the period; a missing anniversary is already clamped to month end.
  if (endDate.getUTCDate() === startDate.getUTCDate()) {
    endDate.setUTCDate(endDate.getUTCDate() - 1);
  }

  return endDate;
}
