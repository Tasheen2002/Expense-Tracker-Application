import { z } from "zod";

export const allocationItemSchema = z
  .object({
    amount: z.number().positive("Amount must be positive"),
    percentage: z.number().min(0).max(100).optional(),
    departmentId: z.string().uuid().optional(),
    costCenterId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    notes: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      // Ensure exactly one target is present
      const targets = [
        data.departmentId,
        data.costCenterId,
        data.projectId,
      ].filter(Boolean);
      return targets.length === 1;
    },
    {
      message:
        "Allocation must have exactly one target (departmentId, costCenterId, or projectId)",
      path: ["departmentId"], // attach error nicely
    },
  );

export const allocateExpenseSchema = z.object({
  allocations: z
    .array(allocationItemSchema)
    .min(1, "At least one allocation is required"),
});

export const expenseIdParamSchema = z.object({
  expenseId: z.string().uuid(),
});

export type AllocateExpenseBody = z.infer<typeof allocateExpenseSchema>;
export type ExpenseIdParam = z.infer<typeof expenseIdParamSchema>;
