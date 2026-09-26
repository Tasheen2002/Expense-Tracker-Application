import { describe, it, expect } from "vitest";
import { BudgetPeriod } from "../domain/value-objects/budget-period";
import { BudgetPeriodType } from "../domain/enums/budget-period-type";

describe("BudgetPeriod Value Object", () => {
  const validStartDate = new Date("2024-01-01T00:00:00Z");
  const validEndDate = new Date("2024-12-31T23:59:59Z");

  it("should create a valid period", () => {
    // Use CUSTOM to respect provided end date
    const period = BudgetPeriod.create(
      validStartDate,
      BudgetPeriodType.CUSTOM,
      validEndDate,
    );
    expect(period.startDate).toEqual(validStartDate);
    expect(period.endDate).toEqual(validEndDate);
    expect(period.periodType).toBe(BudgetPeriodType.CUSTOM);
  });

  it("should throw if start date is after end date", () => {
    const startDate = new Date("2025-01-01");
    const endDate = new Date("2024-01-01");
    expect(() =>
      BudgetPeriod.create(startDate, BudgetPeriodType.CUSTOM, endDate),
    ).toThrow("End date must be after start date");
  });

  it("should correctly identify active period", () => {
    const now = new Date();
    const past = new Date(now.getTime() - 100000);
    const future = new Date(now.getTime() + 100000);

    const period = BudgetPeriod.create(past, BudgetPeriodType.MONTHLY, future);
    // We can't easily mock "now" inside the class unless we use fake timers or pass reference date
    // Assuming isActive() uses new Date() internally
    expect(period.isActive()).toBe(true);
  });

  it("should identify ended period", () => {
    const pastStart = new Date("2020-01-01");
    const pastEnd = new Date("2020-12-31");
    const period = BudgetPeriod.create(
      pastStart,
      BudgetPeriodType.YEARLY,
      pastEnd,
    );
    expect(period.hasEnded()).toBe(true);
  });

  it("should identify future period", () => {
    const futureStart = new Date("2099-01-01");
    const futureEnd = new Date("2099-12-31");
    const period = BudgetPeriod.create(
      futureStart,
      BudgetPeriodType.YEARLY,
      futureEnd,
    );
    expect(period.hasStarted()).toBe(false);
  });

  it("should clamp end date to last day of February when monthly period starts on January 31 (non-leap year)", () => {
    const jan31 = new Date("2026-01-31T00:00:00Z");
    const period = BudgetPeriod.create(jan31, BudgetPeriodType.MONTHLY);

    expect(period.endDate.getFullYear()).toBe(2026);
    expect(period.endDate.getMonth()).toBe(1); // February (0-indexed)
    expect(period.endDate.getDate()).toBe(28); // Feb 28, not March 3!
  });

  it("should clamp end date to February 29 in leap years when monthly period starts on January 31", () => {
    const jan31Leap = new Date("2024-01-31T00:00:00Z");
    const period = BudgetPeriod.create(jan31Leap, BudgetPeriodType.MONTHLY);

    expect(period.endDate.getFullYear()).toBe(2024);
    expect(period.endDate.getMonth()).toBe(1); // February (0-indexed)
    expect(period.endDate.getDate()).toBe(29); // Feb 29
  });

  it("should defend against internal date mutations", () => {
    const originalStart = new Date("2026-01-01T00:00:00Z");
    const period = BudgetPeriod.create(originalStart, BudgetPeriodType.MONTHLY);

    // Mutating the original Date instance
    originalStart.setFullYear(1990);
    expect(period.startDate.getFullYear()).toBe(2026);

    // Mutating the returned getter Date instance
    const getterDate = period.startDate;
    getterDate.setFullYear(2050);
    expect(period.startDate.getFullYear()).toBe(2026);
  });
});
