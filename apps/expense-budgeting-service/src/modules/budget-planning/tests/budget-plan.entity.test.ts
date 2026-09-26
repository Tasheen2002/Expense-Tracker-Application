import { describe, it, expect } from "vitest";
import { BudgetPlan } from "../domain/entities/budget-plan.entity";
import {  WorkspaceId, UserId  } from '@core/domain/value-objects';
import { PlanPeriod } from "../domain/value-objects/plan-period";
import { PlanStatus } from "../domain/enums/plan-status.enum";
import { PeriodType } from "../domain/enums/period-type.enum";
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
      periodType: PeriodType.YEARLY,
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
      periodType: PeriodType.YEARLY,
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

  it("should clear description when updated with null", () => {
    const plan = BudgetPlan.create({
      workspaceId,
      name: "Plan with Description",
      description: "Initial description",
      periodType: PeriodType.YEARLY,
      period,
      createdBy,
    });

    plan.updateDetails("Updated Name", null);

    expect(plan.name).toBe("Updated Name");
    expect(plan.description).toBeNull();
  });

  it("should update status", () => {
    const plan = BudgetPlan.create({
      workspaceId,
      name: "Draft Plan",
      periodType: PeriodType.YEARLY,
      period,
      createdBy,
    });

    plan.updateStatus(PlanStatus.ACTIVE);

    expect(plan.status).toBe(PlanStatus.ACTIVE);
  });

  it("should allow archiving from DRAFT, ACTIVE, and COMPLETED", () => {
    const draftPlan = BudgetPlan.create({
      workspaceId,
      name: "Draft Plan",
      periodType: PeriodType.YEARLY,
      period,
      createdBy,
    });
    draftPlan.updateStatus(PlanStatus.ARCHIVED);
    expect(draftPlan.status).toBe(PlanStatus.ARCHIVED);

    const activePlan = BudgetPlan.create({
      workspaceId,
      name: "Active Plan",
      periodType: PeriodType.YEARLY,
      period,
      createdBy,
    });
    activePlan.updateStatus(PlanStatus.ACTIVE);
    activePlan.updateStatus(PlanStatus.ARCHIVED);
    expect(activePlan.status).toBe(PlanStatus.ARCHIVED);

    const completedPlan = BudgetPlan.create({
      workspaceId,
      name: "Completed Plan",
      periodType: PeriodType.YEARLY,
      period,
      createdBy,
    });
    completedPlan.updateStatus(PlanStatus.ACTIVE);
    completedPlan.updateStatus(PlanStatus.COMPLETED);
    completedPlan.updateStatus(PlanStatus.ARCHIVED);
    expect(completedPlan.status).toBe(PlanStatus.ARCHIVED);
  });

  it("should reject transitions from ARCHIVED", () => {
    const plan = BudgetPlan.create({
      workspaceId,
      name: "Archived Plan",
      periodType: PeriodType.YEARLY,
      period,
      createdBy,
    });
    plan.updateStatus(PlanStatus.ARCHIVED);

    expect(() => plan.updateStatus(PlanStatus.ACTIVE)).toThrow();
    expect(() => plan.updateStatus(PlanStatus.DRAFT)).toThrow();
  });

  it("should throw PlanNotModifiableError when modifying an ARCHIVED plan", () => {
    const plan = BudgetPlan.create({
      workspaceId,
      name: "Archived Plan",
      periodType: PeriodType.YEARLY,
      period,
      createdBy,
    });
    plan.updateStatus(PlanStatus.ARCHIVED);

    expect(() => plan.updateDetails("New Title")).toThrow();
  });

  it("should throw CannotDeleteActivePlanError when deleting an ACTIVE plan", () => {
    const plan = BudgetPlan.create({
      workspaceId,
      name: "Active Plan",
      periodType: PeriodType.YEARLY,
      period,
      createdBy,
    });
    plan.updateStatus(PlanStatus.ACTIVE);

    expect(() => plan.markAsDeleted()).toThrow();
  });

  it("should allow markAsDeleted on DRAFT plan", () => {
    const plan = BudgetPlan.create({
      workspaceId,
      name: "Draft Plan",
      periodType: PeriodType.YEARLY,
      period,
      createdBy,
    });

    plan.markAsDeleted();
    expect(plan.domainEvents.some((e) => e.eventType === "budget_plan.deleted")).toBe(true);
  });

  it("should throw PlanNotModifiableError when recording child events on an ARCHIVED plan", () => {
    const plan = BudgetPlan.create({
      workspaceId,
      name: "Archived Plan",
      periodType: PeriodType.YEARLY,
      period,
      createdBy,
    });
    plan.updateStatus(PlanStatus.ARCHIVED);

    expect(() => plan.recordForecastCreated(uuidv4(), "Forecast 1")).toThrow();
    expect(() => plan.recordScenarioCreated(uuidv4(), "Scenario 1")).toThrow();
  });

  it("should enforce optimistic concurrency version synchronization", () => {
    const plan = BudgetPlan.create({
      workspaceId,
      name: "Versioned Plan",
      periodType: PeriodType.YEARLY,
      period,
      createdBy,
    });
    expect(plan.version).toBe(1);

    plan.synchronizeVersion(2);
    expect(plan.version).toBe(2);

    expect(() => plan.synchronizeVersion(4)).toThrow();
    expect(() => plan.synchronizeVersion(2)).toThrow();
  });

  it("should trim name on create and updateDetails", () => {
    const plan = BudgetPlan.create({
      workspaceId,
      name: "  Trimmed Plan  ",
      periodType: PeriodType.YEARLY,
      period,
      createdBy,
    });
    expect(plan.name).toBe("Trimmed Plan");

    plan.updateDetails("  Updated Trimmed  ");
    expect(plan.name).toBe("Updated Trimmed");
  });

  it("should return defensive copies for createdAt and updatedAt", () => {
    const plan = BudgetPlan.create({
      workspaceId,
      name: "Defensive Date Plan",
      periodType: PeriodType.YEARLY,
      period,
      createdBy,
    });

    const date1 = plan.createdAt;
    date1.setFullYear(1999);
    expect(plan.createdAt.getFullYear()).not.toBe(1999);
  });

  it("should prevent partial mutation if description is invalid during updateDetails", () => {
    const plan = BudgetPlan.create({
      workspaceId,
      name: "Original Name",
      periodType: PeriodType.YEARLY,
      period,
      createdBy,
    });

    const tooLongDescription = "a".repeat(501);
    expect(() => plan.updateDetails("Valid New Name", tooLongDescription)).toThrow();
    // Invariant: Name must remain unchanged because validation failed on description
    expect(plan.name).toBe("Original Name");
  });

  it("should reject BudgetPlan.create when given an intraday period", () => {
    const intradayPeriod = PlanPeriod.create(
      new Date("2026-05-01T09:00:00.000Z"),
      new Date("2026-05-01T10:00:00.000Z")
    );

    expect(() =>
      BudgetPlan.create({
        workspaceId,
        name: "Intraday Plan",
        periodType: PeriodType.MONTHLY,
        period: intradayPeriod,
        createdBy,
      })
    ).toThrow(InvalidPlanPeriodError);
  });

  it("should reject BudgetPlan.create when period has non-midnight UTC times", () => {
    const timePeriod = PlanPeriod.create(
      new Date("2026-05-01T15:00:00.000Z"),
      new Date("2026-05-02T10:00:00.000Z")
    );

    expect(() =>
      BudgetPlan.create({
        workspaceId,
        name: "Time-based Plan",
        periodType: PeriodType.MONTHLY,
        period: timePeriod,
        createdBy,
      })
    ).toThrow(InvalidPlanPeriodError);
  });

  it("should accept BudgetPlan.create when period is explicitly created with createDateOnly", () => {
    const normalizedPeriod = PlanPeriod.createDateOnly(
      new Date("2026-05-01T15:00:00.000Z"),
      new Date("2026-05-02T10:00:00.000Z")
    );

    const plan = BudgetPlan.create({
      workspaceId,
      name: "Normalized Date-Only Plan",
      periodType: PeriodType.MONTHLY,
      period: normalizedPeriod,
      createdBy,
    });

    expect(plan).toBeDefined();
    expect(plan.period.isDateOnly()).toBe(true);
    expect(plan.period.isIntraday()).toBe(false);
    expect(plan.period.startDateOnly).toBe("2026-05-01");
    expect(plan.period.endDateOnly).toBe("2026-05-02");
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

  it("should throw error on createDateOnly when start and end fall on same calendar day", () => {
    const start = new Date("2026-04-10T08:00:00.000Z");
    const end = new Date("2026-04-10T20:00:00.000Z");

    expect(() => PlanPeriod.createDateOnly(start, end)).toThrow(InvalidPlanPeriodError);
  });

  it("should correctly check containment for date-only periods and distinguish calendar vs instant semantics", () => {
    const start = new Date("2024-01-01");
    const end = new Date("2024-01-31");
    const period = PlanPeriod.create(start, end);

    // Date-only plan ending Jan 31 contains Jan 31 at noon because it represents the full calendar day
    expect(period.contains(new Date("2024-01-15"))).toBe(true);
    expect(period.contains(new Date("2024-01-31T12:00:00.000Z"))).toBe(true);
    expect(period.contains(new Date("2024-01-31T23:59:59.999Z"))).toBe(true);
    expect(period.containsDate(new Date("2024-01-31T12:00:00.000Z"))).toBe(true);

    // Instant-based check rejects noon on Jan 31 because end timestamp is midnight
    expect(period.containsInstant(new Date("2024-01-31T12:00:00.000Z"))).toBe(false);

    // Dates outside the calendar month are excluded
    expect(period.contains(new Date("2023-12-31T23:59:59.999Z"))).toBe(false);
    expect(period.contains(new Date("2024-02-01T00:00:00.000Z"))).toBe(false);
  });

  it("should correctly calculate elapsed days vs inclusive calendar days", () => {
    const start5 = new Date("2024-01-01");
    const end5 = new Date("2024-01-05");
    const period5 = PlanPeriod.create(start5, end5);

    // 4 elapsed days between 2024-01-01 and 2024-01-05
    expect(period5.getDurationInDays()).toBe(4);
    // 5 inclusive calendar days (Jan 1, 2, 3, 4, 5)
    expect(period5.getInclusiveDurationInDays()).toBe(5);

    const janStart = new Date("2024-01-01");
    const janEnd = new Date("2024-01-31");
    const janPeriod = PlanPeriod.create(janStart, janEnd);

    // 30 elapsed days
    expect(janPeriod.getDurationInDays()).toBe(30);
    // 31 inclusive calendar days in January
    expect(janPeriod.getInclusiveDurationInDays()).toBe(31);
  });

  it("should normalize dates to UTC midnight and provide date-only contract helpers", () => {
    const startWithTime = new Date("2026-06-01T15:45:30.500Z");
    const endWithTime = new Date("2026-06-30T22:15:00.000Z");
    const normalizedPeriod = PlanPeriod.createDateOnly(startWithTime, endWithTime);

    expect(normalizedPeriod.startDate.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(normalizedPeriod.endDate.toISOString()).toBe("2026-06-30T00:00:00.000Z");
    expect(normalizedPeriod.startDateOnly).toBe("2026-06-01");
    expect(normalizedPeriod.endDateOnly).toBe("2026-06-30");
    expect(normalizedPeriod.isDateOnly()).toBe(true);
    expect(normalizedPeriod.isIntraday()).toBe(false);

    const standardPeriod = PlanPeriod.create(startWithTime, endWithTime);
    expect(standardPeriod.isSameDateRange(normalizedPeriod)).toBe(true);
    expect(standardPeriod.isDateOnly()).toBe(false);
    expect(standardPeriod.isIntraday()).toBe(false);

    const intradayPeriod = PlanPeriod.create(
      new Date("2026-06-01T08:00:00.000Z"),
      new Date("2026-06-01T18:00:00.000Z")
    );
    expect(intradayPeriod.isIntraday()).toBe(true);
    expect(intradayPeriod.isDateOnly()).toBe(false);
  });
});
