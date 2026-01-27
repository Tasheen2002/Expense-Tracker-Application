import { z } from "zod";

export const createCostCenterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(20)
    .regex(
      /^[A-Za-z0-9-_]+$/,
      "Code must be alphanumeric with dashes/underscores",
    ),
  description: z.string().optional(),
});

export const updateCostCenterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(20)
    .regex(
      /^[A-Za-z0-9-_]+$/,
      "Code must be alphanumeric with dashes/underscores",
    )
    .optional(),
  description: z.string().nullable().optional(),
});

export const costCenterIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateCostCenterBody = z.infer<typeof createCostCenterSchema>;
export type UpdateCostCenterBody = z.infer<typeof updateCostCenterSchema>;
export type CostCenterIdParam = z.infer<typeof costCenterIdParamSchema>;
