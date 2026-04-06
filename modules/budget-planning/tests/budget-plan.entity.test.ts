import { describe, it, expect } from "vitest";
import { BudgetPlan } from "../domain/entities/budget-plan.entity";
import { WorkspaceId } from "../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../identity-workspace/domain/value-objects/user-id.vo";
import { PlanPeriod } from "../domain/value-objects/plan-period";
import { PlanStatus } from "../domain/enums/plan-status.enum";
import { InvalidPlanPeriodError } from "../domain/errors/budget-planning.errors";
import { v4 as uuidv4 } from "uuid";

describe("BudgetPlan Entity", () => {
  const workspaceId = WorkspaceId.fromString(uuidv4());
  const createdBy = UserId.fromString(uuidv4());
  const startDate = new Date("2024-01-01");
  const endDate = new Date("2024-12-31");
  const period = PlanPeriod.create(startDate, endDate);

  it("should create a valid BudgetPlan", () => {
    const plan = BudgetPlan.create({
      workspaceId,
      name: "Annual Budget 2024",
      description: "Main budget",
      period,
      createdBy,
    });

    expect(plan.id).toBeDefined();
    expect(plan.name).toBe("Annual Budget 2024");
    expect(plan.description).toBe("Main budget");
    expect(plan.status).toBe(PlanStatus.DRAFT);
    expect(plan.period.startDate).toEqual(startDate);
    expect(plan.period.endDate).toEqual(endDate);
    expect(plan.createdAt).toBeDefined();
  });

  it("should update details", () => {
    const plan = BudgetPlan.create({
      workspaceId,
      name: "Old Name",
      period,
      createdBy,
    });

    plan.updateDetails("New Name", "New Description");

    expect(plan.name).toBe("New Name");
    expect(plan.description).toBe("New Description");
    expect(plan.updatedAt.getTime()).toBeGreaterThanOrEqual(
      plan.createdAt.getTime(),
    );
  });

  it("should update status", () => {
    const plan = BudgetPlan.create({
      workspaceId,
      name: "Draft Plan",
      period,
      createdBy,
    });

    plan.updateStatus(PlanStatus.ACTIVE);

    expect(plan.status).toBe(PlanStatus.ACTIVE);
  });
});

describe("PlanPeriod Value Object", () => {
  it("should throw error if end date is before start date", () => {
    const start = new Date("2024-02-01");
    const end = new Date("2024-01-01");

    expect(() => PlanPeriod.create(start, end)).toThrow(InvalidPlanPeriodError);
  });

  it("should throw error if end date is same as start date", () => {
    const date = new Date("2024-01-01");

    expect(() => PlanPeriod.create(date, date)).toThrow(InvalidPlanPeriodError);
  });

  it("should correctly check containment", () => {
    const start = new Date("2024-01-01");
    const end = new Date("2024-01-31");
    const period = PlanPeriod.create(start, end);

    expect(period.contains(new Date("2024-01-15"))).toBe(true);
    expect(period.contains(new Date("2023-12-31"))).toBe(false);
  });

  it("should correctly calculate duration in days", () => {
    const start = new Date("2024-01-01");
    const end = new Date("2024-01-05"); // 4 days difference
    const period = PlanPeriod.create(start, end);

    expect(period.getDurationInDays()).toBe(4);
  });
});
