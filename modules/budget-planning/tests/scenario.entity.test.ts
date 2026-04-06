import { describe, it, expect } from "vitest";
import { Scenario } from "../domain/entities/scenario.entity";
import { PlanId } from "../domain/value-objects/plan-id";
import { UserId } from "../../identity-workspace";
import { v4 as uuidv4 } from "uuid";

describe("Scenario Entity", () => {
  const planId = PlanId.fromString(uuidv4());
  const createdBy = UserId.fromString(uuidv4());

  it("should create a valid Scenario", () => {
    const scenario = Scenario.create({
      planId,
      name: "Optimistic Case",
      description: "High revenue",
      assumptions: { growth: 0.1 },
      createdBy,
    });

    expect(scenario.id).toBeDefined();
    expect(scenario.name).toBe("Optimistic Case");
    expect(scenario.description).toBe("High revenue");
    expect(scenario.assumptions).toEqual({ growth: 0.1 });
    expect(scenario.createdBy).toBe(createdBy);
    expect(scenario.createdAt).toBeDefined();
  });

  it("should update details", () => {
    const scenario = Scenario.create({
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
});
