import { z } from "zod";

export const createScenarioSchema = z.object({
  planId: z.string().uuid(),
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  assumptions: z.record(z.any()).optional(),
  createdBy: z.string().uuid(),
});
