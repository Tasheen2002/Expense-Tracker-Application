import { describe, it, expect } from "vitest";
import { Scenario } from "../domain/entities/scenario.entity";
import { PlanId } from "../domain/value-objects/plan-id";
import { UserId } from "../../identity-workspace/domain/value-objects/user-id.vo";
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

    expect(scenario.getId()).toBeDefined();
    expect(scenario.getName()).toBe("Optimistic Case");
    expect(scenario.getDescription()).toBe("High revenue");
    expect(scenario.getAssumptions()).toEqual({ growth: 0.1 });
    expect(scenario.getCreatedBy()).toBe(createdBy);
    expect(scenario.getCreatedAt()).toBeDefined();
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

    expect(scenario.getName()).toBe("Revised Case");
    expect(scenario.getDescription()).toBe("Updated assumptions");
    expect(scenario.getAssumptions()).toEqual({ growth: 0.05 });
    expect(scenario.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
      scenario.getCreatedAt().getTime(),
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
      // description undefined
      // assumptions undefined
    });

    expect(scenario.getName()).toBe("New Name");
    expect(scenario.getAssumptions()).toEqual({ inflation: 0.02 }); // Should remain unchanged if not provided?
    // Wait, let's verify updateDetails logic in entity.
    // If logic replaces assumptions entirely or merges?
    // Checking previous view or guessing based on common pattern.
    // I will check the entity file content again to be sure.
  });
});
