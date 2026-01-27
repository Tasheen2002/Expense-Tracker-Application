import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(20)
    .regex(
      /^[A-Za-z0-9-_]+$/,
      "Code must be alphanumeric with dashes/underscores",
    ),
  startDate: z.string().datetime().or(z.date()),
  description: z.string().optional(),
  endDate: z.string().datetime().or(z.date()).optional(),
  managerId: z.string().uuid().optional(),
  budget: z.number().positive().optional(),
});

export const updateProjectSchema = z.object({
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
  startDate: z.string().datetime().or(z.date()).optional(),
  description: z.string().nullable().optional(),
  endDate: z.string().datetime().or(z.date()).nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  budget: z.number().positive().nullable().optional(),
});

export const projectIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateProjectBody = z.infer<typeof createProjectSchema>;
export type UpdateProjectBody = z.infer<typeof updateProjectSchema>;
export type ProjectIdParam = z.infer<typeof projectIdParamSchema>;
