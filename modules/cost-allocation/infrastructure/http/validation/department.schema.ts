import { z } from "zod";

export const createDepartmentSchema = z.object({
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
  managerId: z.string().uuid().optional(),
  parentDepartmentId: z.string().uuid().optional(),
});

export const updateDepartmentSchema = z.object({
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
  managerId: z.string().uuid().nullable().optional(),
  parentDepartmentId: z.string().uuid().nullable().optional(),
});

export const departmentIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateDepartmentBody = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentBody = z.infer<typeof updateDepartmentSchema>;
export type DepartmentIdParam = z.infer<typeof departmentIdParamSchema>;
