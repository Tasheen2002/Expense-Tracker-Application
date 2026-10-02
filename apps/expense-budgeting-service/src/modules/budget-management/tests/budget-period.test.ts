import { describe, it, expect } from "vitest";
import { BudgetPeriod } from "../domain/value-objects/budget-period";
import { BudgetPeriodType } from "../domain/enums/budget-period-type";
import { calculateEndDate } from "../domain/enums/budget-period-type";
import { InvalidBudgetPeriodError } from "../domain/errors/budget.errors";

describe("BudgetPeriod Value Object", () => {
  const validStartDate = new Date("2024-01-01T00:00:00Z");
  const validEndDate = new Date("2024-12-31T00:00:00Z");

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
    ).toThrow("End date must not precede start date");
  });

  it("should correctly identify active period", () => {
    const now = new Date();
    const past = new Date(now.getTime() - 100000);
    const period = BudgetPeriod.create(past, BudgetPeriodType.MONTHLY);
    expect(period.isActive()).toBe(true);
  });

  it("should identify ended period", () => {
    const pastStart = new Date("2020-01-01");
    const period = BudgetPeriod.create(
      pastStart,
      BudgetPeriodType.YEARLY,
    );
    expect(period.hasEnded()).toBe(true);
  });

  it("should identify future period", () => {
    const futureStart = new Date("2099-01-01");
    const period = BudgetPeriod.create(
      futureStart,
      BudgetPeriodType.YEARLY,
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

  it("ends fixed periods the day before the next anniversary when dates are inclusive", () => {
    expect(BudgetPeriod.create(new Date("2026-01-01"), BudgetPeriodType.MONTHLY)
      .endDate.toISOString()).toBe("2026-01-31T00:00:00.000Z");
    expect(BudgetPeriod.create(new Date("2026-01-15"), BudgetPeriodType.MONTHLY)
      .endDate.toISOString()).toBe("2026-02-14T00:00:00.000Z");
    expect(BudgetPeriod.create(new Date("2026-01-01"), BudgetPeriodType.QUARTERLY)
      .endDate.toISOString()).toBe("2026-03-31T00:00:00.000Z");
    expect(BudgetPeriod.create(new Date("2026-01-01"), BudgetPeriodType.YEARLY)
      .endDate.toISOString()).toBe("2026-12-31T00:00:00.000Z");
  });

  it("rejects invalid dates and unsupported period types", () => {
    expect(() => calculateEndDate(new Date(NaN), BudgetPeriodType.MONTHLY))
      .toThrow(InvalidBudgetPeriodError);
    expect(() => calculateEndDate(validStartDate, "WEEKLY" as BudgetPeriodType))
      .toThrow(InvalidBudgetPeriodError);
  });

  it("calculates date-only periods from UTC calendar fields", () => {
    const endDate = calculateEndDate(
      new Date("2026-01-31T23:00:00.000Z"),
      BudgetPeriodType.MONTHLY,
    );
    expect(endDate.toISOString()).toBe("2026-02-28T23:00:00.000Z");
  });

  it("retains a one-day custom period through reconstitution", () => {
    const period = BudgetPeriod.create(
      new Date("2026-09-30T08:00:00Z"),
      BudgetPeriodType.CUSTOM,
      new Date("2026-09-30T09:00:00Z"),
    );
    const restored = BudgetPeriod.fromDates(
      period.startDate,
      period.endDate,
      period.periodType,
    );

    expect(restored.equals(period)).toBe(true);
    expect(restored.getDurationInDays()).toBe(1);
    expect(restored.startDate.toISOString()).toBe("2026-09-30T00:00:00.000Z");
  });

  it("keeps the end date active for the entire UTC calendar day", () => {
    const period = BudgetPeriod.fromDates(
      new Date("2026-09-29"),
      new Date("2026-09-30"),
      BudgetPeriodType.CUSTOM,
    );

    expect(period.isActive(new Date("2026-09-30T23:59:59.999Z"))).toBe(true);
    expect(period.hasEnded(new Date("2026-09-30T23:59:59.999Z"))).toBe(false);
    expect(period.hasEnded(new Date("2026-10-01T00:00:00Z"))).toBe(true);
    expect(period.getDurationInDays()).toBe(2);
  });

  it("rejects invalid dates in custom creation and reconstitution", () => {
    expect(() => BudgetPeriod.create(new Date(NaN), BudgetPeriodType.CUSTOM, validEndDate))
      .toThrow(InvalidBudgetPeriodError);
    expect(() => BudgetPeriod.create(validStartDate, BudgetPeriodType.CUSTOM, new Date(NaN)))
      .toThrow(InvalidBudgetPeriodError);
    expect(() => BudgetPeriod.fromDates(validStartDate, new Date(NaN), BudgetPeriodType.CUSTOM))
      .toThrow(InvalidBudgetPeriodError);
  });

  it("rejects an explicit end date for a fixed-length period", () => {
    expect(() => BudgetPeriod.create(validStartDate, BudgetPeriodType.MONTHLY, validEndDate))
      .toThrow(InvalidBudgetPeriodError);
  });
});
