import { describe, it, expect } from "vitest";
import { ForecastAmount } from "../domain/value-objects/forecast-amount";
import Decimal from "decimal.js";

// Mock constants if needed or rely on actual
// Assuming MIN_AMOUNT = 0, MAX_AMOUNT = 1_000_000_000 (1 Billion) based on typical finance apps
// I'll verify via the view_file output if I can, but generalized tests work too.

describe("ForecastAmount Logic", () => {
  it("should create a valid ForecastAmount", () => {
    const amount = ForecastAmount.create(100.5);
    expect(amount.toNumber()).toBe(100.5);
    expect(amount.toString()).toBe("100.50");
  });

  it("should enforce validation limits", () => {
    // Check MIN
    expect(() => ForecastAmount.create(-1)).toThrow(
      /ForecastAmount cannot be less than/,
    );

    // Check MAX (Assuming 1 Billion+ triggers it, or sufficiently large)
    const hugeAmount = new Decimal("999999999999999");
    expect(() => ForecastAmount.create(hugeAmount)).toThrow(
      /ForecastAmount cannot be greater than/,
    );
  });

  it("should add amounts correctly", () => {
    const a = ForecastAmount.create(100);
    const b = ForecastAmount.create(50);
    const result = a.add(b);

    expect(result.toNumber()).toBe(150);
    expect(a.toNumber()).toBe(100); // Immutability
  });

  it("should subtract amounts correctly", () => {
    const a = ForecastAmount.create(100);
    const b = ForecastAmount.create(30);
    const result = a.subtract(b);

    expect(result.toNumber()).toBe(70);
  });

  it("should throw validation error on resulting calculation if out of bounds", () => {
    // If we subtract to negative, it should throw
    const a = ForecastAmount.create(10);
    const b = ForecastAmount.create(20);

    expect(() => a.subtract(b)).toThrow(/ForecastAmount cannot be less than/);
  });

  it("should handle string inputs", () => {
    const amount = ForecastAmount.create("123.45");
    expect(amount.toNumber()).toBe(123.45);
  });

  it("should reject more than 2 decimal places in create and allow explicit rounding via fromRounded", () => {
    expect(() => ForecastAmount.create("123.456")).toThrow(
      /cannot have more than 2 decimal places/,
    );

    const rounded = ForecastAmount.fromRounded("123.456");
    expect(rounded.toNumber()).toBe(123.46);
    expect(rounded.toString()).toBe("123.46");
  });
});
