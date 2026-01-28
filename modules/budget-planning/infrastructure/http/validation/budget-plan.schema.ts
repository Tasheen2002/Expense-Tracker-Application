import { z } from "zod";
import { PlanStatus } from "../../../domain/enums/plan-status.enum";

export const createBudgetPlanSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  startDate: z.string().datetime(), // Expecting ISO string
  endDate: z.string().datetime(),
  createdBy: z.string().uuid(),
});

export const updateBudgetPlanSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
});

export const listBudgetPlansSchema = z.object({
  workspaceId: z.string().uuid(),
  status: z.nativeEnum(PlanStatus).optional(),
});
