import { describe, it, expect } from "vitest";
import { Scenario } from "../domain/entities/scenario.entity";
import { PlanId } from "../domain/value-objects/plan-id";
import { WorkspaceId, UserId } from '@core/domain/value-objects';
import { v4 as uuidv4 } from "uuid";

describe("Scenario Entity", () => {
  const workspaceId = WorkspaceId.fromString(uuidv4());
  const planId = PlanId.fromString(uuidv4());
  const createdBy = UserId.fromString(uuidv4());

  it("should create a valid Scenario", () => {
    const scenario = Scenario.create({
      workspaceId,
      planId,
      name: "Optimistic Case",
      description: "High revenue",
      assumptions: { growth: 0.1 },
      createdBy,
    });

    expect(scenario.id).toBeDefined();
    expect(scenario.workspaceId).toBe(workspaceId);
    expect(scenario.name).toBe("Optimistic Case");
    expect(scenario.description).toBe("High revenue");
    expect(scenario.assumptions).toEqual({ growth: 0.1 });
    expect(scenario.createdBy).toBe(createdBy);
    expect(scenario.createdAt).toBeDefined();
  });

  it("should update details", () => {
    const scenario = Scenario.create({
      workspaceId,
      planId,
      name: "Base Case",
      createdBy,
    });

    scenario.updateDetails({
      name: "Revised Case",
      description: "Updated assumptions",
      assumptions: { growth: 0.05 },
    });

    expect(scenario.name).toBe("Revised Case");
    expect(scenario.description).toBe("Updated assumptions");
    expect(scenario.assumptions).toEqual({ growth: 0.05 });
    expect(scenario.updatedAt.getTime()).toBeGreaterThanOrEqual(
      scenario.createdAt.getTime(),
    );
  });

  it("should handle partial updates", () => {
    const scenario = Scenario.create({
      workspaceId,
      planId,
      name: "Base Case",
      assumptions: { inflation: 0.02 },
      createdBy,
    });

    scenario.updateDetails({
      name: "New Name",
    });

    expect(scenario.name).toBe("New Name");
    expect(scenario.assumptions).toEqual({ inflation: 0.02 });
  });

  it("should clear description and assumptions when updated with null", () => {
    const scenario = Scenario.create({
      workspaceId,
      planId,
      name: "Base Case",
      description: "Initial description",
      assumptions: { inflation: 0.02 },
      createdBy,
    });

    scenario.updateDetails({
      description: null,
      assumptions: null,
    });

    expect(scenario.description).toBeNull();
    expect(scenario.assumptions).toBeNull();
  });

  it("should deeply protect assumptions from external mutation of the input object", () => {
    const rawAssumptions = {
      rates: {
        growth: 0.1,
        nested: { value: 42 },
      },
    };

    const scenario = Scenario.create({
      workspaceId,
      planId,
      name: "Protected Case",
      assumptions: rawAssumptions,
      createdBy,
    });

    // Mutate input after creation
    rawAssumptions.rates.growth = 0.99;
    rawAssumptions.rates.nested.value = 999;

    expect(scenario.assumptions).toEqual({
      rates: {
        growth: 0.1,
        nested: { value: 42 },
      },
    });
  });

  it("should deeply freeze assumptions returned by getter", () => {
    const scenario = Scenario.create({
      workspaceId,
      planId,
      name: "Frozen Case",
      assumptions: {
        rates: {
          growth: 0.1,
        },
      },
      createdBy,
    });

    const retrieved = scenario.assumptions;
    expect(retrieved).not.toBeNull();
    expect(Object.isFrozen(retrieved)).toBe(true);
    expect(Object.isFrozen((retrieved as any).rates)).toBe(true);

    // Attempting to mutate nested property should fail / not alter internal state
    expect(() => {
      (retrieved as any).rates.growth = 0.99;
    }).toThrow();

    expect(scenario.assumptions).toEqual({
      rates: {
        growth: 0.1,
      },
    });
  });

  it("should prevent partial mutation if description is invalid during updateDetails", () => {
    const scenario = Scenario.create({
      workspaceId,
      planId,
      name: "Initial Name",
      description: "Initial Desc",
      createdBy,
    });

    const tooLongDescription = "x".repeat(501);
    expect(() =>
      scenario.updateDetails({
        name: "Valid New Name",
        description: tooLongDescription,
      })
    ).toThrow();

    // Invariant: name must remain unchanged
    expect(scenario.name).toBe("Initial Name");
    expect(scenario.description).toBe("Initial Desc");
  });

  it("should strictly reject assumptions containing NaN or Infinity instead of silently coercing to null", () => {
    expect(() =>
      Scenario.create({
        workspaceId,
        planId,
        name: "NaN Assumption Case",
        assumptions: { rate: NaN },
        createdBy,
      })
    ).toThrow(/NaN or Infinity/);

    expect(() =>
      Scenario.create({
        workspaceId,
        planId,
        name: "Infinity Assumption Case",
        assumptions: { limit: Infinity },
        createdBy,
      })
    ).toThrow(/NaN or Infinity/);

    expect(() =>
      Scenario.create({
        workspaceId,
        planId,
        name: "Nested NaN Case",
        assumptions: { nested: { metric: NaN } },
        createdBy,
      })
    ).toThrow(/NaN or Infinity/);
  });

  it("should strictly reject assumptions containing undefined, functions, or symbols", () => {
    expect(() =>
      Scenario.create({
        workspaceId,
        planId,
        name: "Undefined Assumption Case",
        assumptions: { missing: undefined } as any,
        createdBy,
      })
    ).toThrow(/undefined values/);

    expect(() =>
      Scenario.create({
        workspaceId,
        planId,
        name: "Function Assumption Case",
        assumptions: { callback: () => {} } as any,
        createdBy,
      })
    ).toThrow(/non-serializable/);
  });
});
