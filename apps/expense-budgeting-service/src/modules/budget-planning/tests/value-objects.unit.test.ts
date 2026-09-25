import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  ForecastAmount,
  PlanPeriod,
  PlanId,
  ForecastId,
  ForecastItemId,
  ScenarioId,
} from "../domain/value-objects";
import {
  InvalidForecastAmountError,
  InvalidPlanPeriodError,
} from "../domain/errors/budget-planning.errors";
import { InvalidUuidError } from "@core/domain/value-objects/uuid-id.base";

describe("Budget Planning - Value Objects Unit Tests", () => {
  describe("ForecastAmount", () => {
    it("should create a valid ForecastAmount from number, string, and Decimal", () => {
      const fromNum = ForecastAmount.create(150.75);
      const fromStr = ForecastAmount.create("150.75");
      const fromDec = ForecastAmount.create(new Decimal("150.75"));

      expect(fromNum.toNumber()).toBe(150.75);
      expect(fromStr.toNumber()).toBe(150.75);
      expect(fromDec.toNumber()).toBe(150.75);
      expect(fromNum.toString()).toBe("150.75");
      expect(fromNum.equals(fromStr)).toBe(true);
      expect(fromNum.equals(fromDec)).toBe(true);
    });

    it("should format string representation to 2 decimal places", () => {
      const amount = ForecastAmount.create(25);
      expect(amount.toString()).toBe("25.00");
    });

    it("should reject null, undefined, and empty string with InvalidForecastAmountError", () => {
      expect(() => ForecastAmount.create(null as unknown as number)).toThrow(
        InvalidForecastAmountError,
      );
      expect(() => ForecastAmount.create(undefined as unknown as number)).toThrow(
        InvalidForecastAmountError,
      );
      expect(() => ForecastAmount.create("   ")).toThrow(
        InvalidForecastAmountError,
      );
    });

    it("should reject non-numeric string with InvalidForecastAmountError", () => {
      expect(() => ForecastAmount.create("not-a-number")).toThrow(
        InvalidForecastAmountError,
      );
    });

    it("should reject NaN and Infinity", () => {
      expect(() => ForecastAmount.create(NaN)).toThrow(
        InvalidForecastAmountError,
      );
      expect(() => ForecastAmount.create(Infinity)).toThrow(
        InvalidForecastAmountError,
      );
    });

    it("should reject amounts below MIN_AMOUNT (negative)", () => {
      expect(() => ForecastAmount.create(-0.01)).toThrow(
        InvalidForecastAmountError,
      );
    });

    it("should reject amounts exceeding MAX_AMOUNT", () => {
      expect(() => ForecastAmount.create("10000000000.00")).toThrow(
        InvalidForecastAmountError,
      );
    });

    it("should reject fractional cents (> 2 decimal places)", () => {
      expect(() => ForecastAmount.create(1.005)).toThrow(
        InvalidForecastAmountError,
      );
      expect(() => ForecastAmount.create("10.999")).toThrow(
        InvalidForecastAmountError,
      );
      expect(() => ForecastAmount.create("0.001")).toThrow(
        InvalidForecastAmountError,
      );
      expect(() => ForecastAmount.create(new Decimal("12.345"))).toThrow(
        InvalidForecastAmountError,
      );
    });

    it("should explicitly round using fromRounded with default and custom rounding modes", () => {
      const roundedHalfUp = ForecastAmount.fromRounded(1.005);
      expect(roundedHalfUp.toNumber()).toBe(1.01);
      expect(roundedHalfUp.toString()).toBe("1.01");

      const roundedDown = ForecastAmount.fromRounded("1.009", Decimal.ROUND_DOWN);
      expect(roundedDown.toNumber()).toBe(1.00);
      expect(roundedDown.toString()).toBe("1.00");
    });

    it("should ensure toString() and toNumber() strictly align on 2 decimal places", () => {
      const amount = ForecastAmount.create("49.99");
      expect(amount.toNumber()).toBe(49.99);
      expect(amount.toString()).toBe("49.99");
    });

    it("should add amounts immutably", () => {
      const a = ForecastAmount.create(100);
      const b = ForecastAmount.create(50);
      const result = a.add(b);

      expect(result.toNumber()).toBe(150);
      expect(a.toNumber()).toBe(100);
      expect(b.toNumber()).toBe(50);
    });

    it("should subtract amounts immutably", () => {
      const a = ForecastAmount.create(100);
      const b = ForecastAmount.create(35.5);
      const result = a.subtract(b);

      expect(result.toNumber()).toBe(64.5);
      expect(a.toNumber()).toBe(100);
    });

    it("should throw InvalidForecastAmountError when subtraction results in negative", () => {
      const a = ForecastAmount.create(20);
      const b = ForecastAmount.create(50);

      expect(() => a.subtract(b)).toThrow(InvalidForecastAmountError);
    });

    it("should support query methods: isZero, isPositive, isGreaterThan, isLessThan", () => {
      const zero = ForecastAmount.create(0);
      const positive = ForecastAmount.create(100);
      const greater = ForecastAmount.create(200);

      expect(zero.isZero()).toBe(true);
      expect(zero.isPositive()).toBe(false);
      expect(positive.isZero()).toBe(false);
      expect(positive.isPositive()).toBe(true);

      expect(greater.isGreaterThan(positive)).toBe(true);
      expect(positive.isLessThan(greater)).toBe(true);
      expect(positive.isGreaterThan(greater)).toBe(false);
    });

    it("should correctly test equals with null/undefined and other types", () => {
      const a = ForecastAmount.create(100);
      const b = ForecastAmount.create(100);
      const c = ForecastAmount.create(200);

      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
      expect(a.equals(null)).toBe(false);
      expect(a.equals(undefined)).toBe(false);
    });
  });

  describe("PlanPeriod", () => {
    it("should create a valid PlanPeriod with valid dates", () => {
      const start = new Date("2026-01-01T00:00:00.000Z");
      const end = new Date("2026-01-31T23:59:59.999Z");
      const period = PlanPeriod.create(start, end);

      expect(period.startDate.getTime()).toBe(start.getTime());
      expect(period.endDate.getTime()).toBe(end.getTime());
      expect(period.toString()).toBe("2026-01-01 to 2026-01-31");
    });

    it("should reject invalid dates (NaN)", () => {
      expect(() =>
        PlanPeriod.create(new Date("invalid"), new Date("2026-01-31")),
      ).toThrow(InvalidPlanPeriodError);
      expect(() =>
        PlanPeriod.create(new Date("2026-01-01"), new Date("invalid")),
      ).toThrow(InvalidPlanPeriodError);
    });

    it("should reject end date <= start date", () => {
      const date = new Date("2026-01-01");
      expect(() => PlanPeriod.create(date, date)).toThrow(
        InvalidPlanPeriodError,
      );

      const before = new Date("2025-12-31");
      expect(() => PlanPeriod.create(date, before)).toThrow(
        InvalidPlanPeriodError,
      );
    });

    it("should enforce immutability via defensive copying", () => {
      const start = new Date("2026-01-01");
      const end = new Date("2026-01-31");
      const period = PlanPeriod.create(start, end);

      // Mutate input date
      start.setFullYear(2035);
      expect(period.startDate.getFullYear()).toBe(2026);

      // Mutate returned date
      const retrievedStart = period.startDate;
      retrievedStart.setFullYear(2035);
      expect(period.startDate.getFullYear()).toBe(2026);
    });

    it("should correctly check containment", () => {
      const period = PlanPeriod.create(
        new Date("2026-01-01T00:00:00.000Z"),
        new Date("2026-01-31T23:59:59.999Z"),
      );

      expect(period.contains(new Date("2026-01-01T00:00:00.000Z"))).toBe(true);
      expect(period.contains(new Date("2026-01-15T12:00:00.000Z"))).toBe(true);
      expect(period.contains(new Date("2026-01-31T23:59:59.999Z"))).toBe(true);
      expect(period.contains(new Date("2025-12-31T23:59:59.999Z"))).toBe(false);
      expect(period.contains(new Date("2026-02-01T00:00:00.000Z"))).toBe(false);
      expect(period.contains(new Date("invalid"))).toBe(false);
    });

    it("should correctly check overlaps between periods", () => {
      const jan = PlanPeriod.create(
        new Date("2026-01-01"),
        new Date("2026-01-31"),
      );
      const midJanMidFeb = PlanPeriod.create(
        new Date("2026-01-15"),
        new Date("2026-02-15"),
      );
      const feb = PlanPeriod.create(
        new Date("2026-02-01"),
        new Date("2026-02-28"),
      );

      expect(jan.overlaps(midJanMidFeb)).toBe(true);
      expect(midJanMidFeb.overlaps(jan)).toBe(true);
      expect(jan.overlaps(feb)).toBe(false);
      expect(midJanMidFeb.overlaps(feb)).toBe(true);
    });

    it("should treat shared boundary endpoints consistently between contains and overlaps", () => {
      const endpoint = new Date("2026-01-15T12:00:00.000Z");
      const period1 = PlanPeriod.create(
        new Date("2026-01-01T00:00:00.000Z"),
        endpoint,
      );
      const period2 = PlanPeriod.create(
        endpoint,
        new Date("2026-01-31T23:59:59.999Z"),
      );

      // Both periods contain the exact shared endpoint (closed interval)
      expect(period1.contains(endpoint)).toBe(true);
      expect(period2.contains(endpoint)).toBe(true);

      // Both periods overlap because they meet at the shared endpoint
      expect(period1.overlaps(period2)).toBe(true);
      expect(period2.overlaps(period1)).toBe(true);
    });

    it("should not overlap when periods are strictly disjoint without sharing endpoints", () => {
      const period1 = PlanPeriod.create(
        new Date("2026-01-01T00:00:00.000Z"),
        new Date("2026-01-15T11:59:59.999Z"),
      );
      const period2 = PlanPeriod.create(
        new Date("2026-01-15T12:00:00.000Z"),
        new Date("2026-01-31T23:59:59.999Z"),
      );

      expect(period1.overlaps(period2)).toBe(false);
      expect(period2.overlaps(period1)).toBe(false);
    });

    it("should support value equality (equals)", () => {
      const p1 = PlanPeriod.create(
        new Date("2026-01-01"),
        new Date("2026-01-31"),
      );
      const p2 = PlanPeriod.create(
        new Date("2026-01-01"),
        new Date("2026-01-31"),
      );
      const p3 = PlanPeriod.create(
        new Date("2026-02-01"),
        new Date("2026-02-28"),
      );

      expect(p1.equals(p2)).toBe(true);
      expect(p1.equals(p3)).toBe(false);
      expect(p1.equals(null)).toBe(false);
      expect(p1.equals(undefined)).toBe(false);
    });

    it("should calculate duration in days", () => {
      const period = PlanPeriod.create(
        new Date("2026-01-01"),
        new Date("2026-01-11"),
      );
      expect(period.getDurationInDays()).toBe(10);
    });
  });

  describe("Identity Value Objects (PlanId, ForecastId, ForecastItemId, ScenarioId)", () => {
    it("should create valid UUIDs with create()", () => {
      const planId = PlanId.create();
      const forecastId = ForecastId.create();
      const itemId = ForecastItemId.create();
      const scenarioId = ScenarioId.create();

      expect(PlanId.isValid(planId.getValue())).toBe(true);
      expect(ForecastId.isValid(forecastId.getValue())).toBe(true);
      expect(ForecastItemId.isValid(itemId.getValue())).toBe(true);
      expect(ScenarioId.isValid(scenarioId.getValue())).toBe(true);
    });

    it("should instantiate from valid UUID string", () => {
      const uuid = "123e4567-e89b-12d3-a456-426614174000";
      const planId = PlanId.fromString(uuid);
      expect(planId.getValue()).toBe(uuid);
      expect(planId.toString()).toBe(uuid);
      expect(planId.toJSON()).toBe(uuid);
    });

    it("should reject invalid UUID string with InvalidUuidError", () => {
      expect(() => PlanId.fromString("invalid-uuid")).toThrow(InvalidUuidError);
      expect(() => ForecastId.fromString("123")).toThrow(InvalidUuidError);
      expect(() => ForecastItemId.fromString("")).toThrow(InvalidUuidError);
      expect(() => ScenarioId.fromString("xyz")).toThrow(InvalidUuidError);
    });

    it("should support equality comparison", () => {
      const uuid = "123e4567-e89b-12d3-a456-426614174000";
      const p1 = PlanId.fromString(uuid);
      const p2 = PlanId.fromString(uuid);
      const p3 = PlanId.create();

      expect(p1.equals(p2)).toBe(true);
      expect(p1.equals(p3)).toBe(false);
      expect(p1.equals(null)).toBe(false);
    });

    it("should not be equal across different ID types with same UUID", () => {
      const uuid = "123e4567-e89b-12d3-a456-426614174000";
      const planId = PlanId.fromString(uuid);
      const forecastId = ForecastId.fromString(uuid);

      expect(planId.equals(forecastId as unknown as PlanId)).toBe(false);
    });
  });
});
