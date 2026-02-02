import { describe, it, expect } from "vitest";
import { BudgetId } from "../domain/value-objects/budget-id";

describe("BudgetId Value Object", () => {
  it("should create valid budget ID", () => {
    const id = BudgetId.create();
    expect(id.getValue()).toMatch(/^[0-9a-f-]{36}$/);
    expect(id).toBeDefined();
  });

  it("should create from existing string", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    const id = BudgetId.fromString(uuid);
    expect(id.getValue()).toBe(uuid);
  });

  it("should reject invalid UUID", () => {
    expect(() => BudgetId.fromString("invalid-uuid")).toThrow();
  });

  it("should check equality", () => {
    const id1 = BudgetId.create();
    const id2 = BudgetId.create();
    const id3 = BudgetId.fromString(id1.getValue());

    expect(id1.equals(id2)).toBe(false);
    expect(id1.equals(id3)).toBe(true);
  });
});
