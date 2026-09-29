import { describe, expect, it } from "vitest";
import { createBudgetSchema } from "../infrastructure/http/validation/budget.schema";

describe("budget period request validation", () => {
  const budget = {
    name: "Travel",
    totalAmount: 100,
    currency: "USD",
    startDate: "2026-09-30T08:00:00.000Z",
  };

  it("requires an end date only for custom periods", () => {
    expect(createBudgetSchema.safeParse({ ...budget, periodType: "MONTHLY" }).success)
      .toBe(true);
    expect(createBudgetSchema.safeParse({ ...budget, periodType: "CUSTOM" }).success)
      .toBe(false);
    expect(createBudgetSchema.safeParse({
      ...budget,
      periodType: "CUSTOM",
      endDate: "2026-09-30T09:00:00.000Z",
    }).success).toBe(true);
    expect(createBudgetSchema.safeParse({
      ...budget,
      periodType: "MONTHLY",
      endDate: "2026-10-30T08:00:00.000Z",
    }).success).toBe(false);
  });
});
