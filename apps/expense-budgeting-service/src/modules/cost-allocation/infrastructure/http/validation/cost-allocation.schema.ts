import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import { toJsonSchema } from './validator';

// ==================== PARAM SCHEMAS ====================

export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid(),
});

export const departmentParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  departmentId: z.string().uuid(),
});

export const costCenterParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  costCenterId: z.string().uuid(),
});

export const projectParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
});

export const expenseParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  expenseId: z.string().uuid(),
});

// ==================== DEPARTMENT SCHEMAS ====================

const codeSchema = z.string().trim().min(2).max(20).regex(/^[A-Za-z0-9_-]+$/);

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: codeSchema,
  description: z.string().optional(),
  managerId: z.string().uuid().optional(),
  parentDepartmentId: z.string().uuid().optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  code: codeSchema.optional(),
  description: z.string().nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  parentDepartmentId: z.string().uuid().nullable().optional(),
});

// ==================== COST CENTER SCHEMAS ====================

export const createCostCenterSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: codeSchema,
  description: z.string().optional(),
});

export const updateCostCenterSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  code: codeSchema.optional(),
  description: z.string().nullable().optional(),
});

// ==================== PROJECT SCHEMAS ====================

// Keep the Zod input contract aligned with the date-time JSON Schema used by Fastify.
const projectDateSchema = z.string().datetime({ offset: true }).transform((value) => new Date(value));

export const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: codeSchema,
  startDate: projectDateSchema,
  description: z.string().optional(),
  endDate: projectDateSchema.optional(),
  managerId: z.string().uuid().optional(),
  budget: z.coerce.number().min(0).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  code: codeSchema.optional(),
  description: z.string().nullable().optional(),
  startDate: projectDateSchema.optional(),
  endDate: projectDateSchema.nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  budget: z.coerce.number().min(0).nullable().optional(),
});

// ==================== EXPENSE ALLOCATION SCHEMAS ====================

export const allocateExpenseSchema = z.object({
  allocations: z.array(
    z.object({
      amount: z.coerce.number().min(0.01),
      percentage: z.coerce.number().finite().min(0).max(100)
        .refine((value) => new Decimal(value).decimalPlaces() <= 2, 'Percentage cannot exceed two decimal places')
        .optional(),
      departmentId: z.string().uuid().optional(),
      costCenterId: z.string().uuid().optional(),
      projectId: z.string().uuid().optional(),
      notes: z.string().max(500).optional(),
    })
  ).min(1),
});

// ==================== COMMON SCHEMAS ====================

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).max(100_000).optional().default(0),
});

// ==================== RESPONSE SCHEMAS ====================

export const departmentResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  managerId: z.string().uuid().nullable(),
  parentDepartmentId: z.string().uuid().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const costCenterResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const projectResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  managerId: z.string().uuid().nullable(),
  budget: z.number().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const expenseAllocationResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  expenseId: z.string().uuid(),
  amount: z.string(),
  percentage: z.string().nullable(),
  departmentId: z.string().uuid().nullable(),
  costCenterId: z.string().uuid().nullable(),
  projectId: z.string().uuid().nullable(),
  notes: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
});

export const allocationSummaryResponseSchema = z.object({
  totalAllocations: z.number(),
  byDepartment: z.array(
    z.object({
      departmentId: z.string().uuid(),
      departmentName: z.string(),
      currency: z.string().length(3),
      total: z.string(),
      count: z.number(),
    })
  ),
  byCostCenter: z.array(
    z.object({
      costCenterId: z.string().uuid(),
      costCenterName: z.string(),
      currency: z.string().length(3),
      total: z.string(),
      count: z.number(),
    })
  ),
  byProject: z.array(
    z.object({
      projectId: z.string().uuid(),
      projectName: z.string(),
      currency: z.string().length(3),
      total: z.string(),
      count: z.number(),
    })
  ),
});

// ==================== INFERRED INPUT TYPES ====================

export type WorkspaceParamsInput = z.infer<typeof workspaceParamsSchema>;
export type DepartmentParamsInput = z.infer<typeof departmentParamsSchema>;
export type CostCenterParamsInput = z.infer<typeof costCenterParamsSchema>;
export type ProjectParamsInput = z.infer<typeof projectParamsSchema>;
export type ExpenseParamsInput = z.infer<typeof expenseParamsSchema>;

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type CreateCostCenterInput = z.infer<typeof createCostCenterSchema>;
export type UpdateCostCenterInput = z.infer<typeof updateCostCenterSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AllocateExpenseInput = z.infer<typeof allocateExpenseSchema>;
export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>;

// ==================== PRE-COMPUTED JSON SCHEMAS ====================

export const workspaceParamsJsonSchema = toJsonSchema(workspaceParamsSchema);
export const departmentParamsJsonSchema = toJsonSchema(departmentParamsSchema);
export const costCenterParamsJsonSchema = toJsonSchema(costCenterParamsSchema);
export const projectParamsJsonSchema = toJsonSchema(projectParamsSchema);
export const expenseParamsJsonSchema = toJsonSchema(expenseParamsSchema);

export const createDepartmentBodyJsonSchema = toJsonSchema(createDepartmentSchema);
export const updateDepartmentBodyJsonSchema = toJsonSchema(updateDepartmentSchema);
export const createCostCenterBodyJsonSchema = toJsonSchema(createCostCenterSchema);
export const updateCostCenterBodyJsonSchema = toJsonSchema(updateCostCenterSchema);
export const createProjectBodyJsonSchema = toJsonSchema(createProjectSchema);
export const updateProjectBodyJsonSchema = toJsonSchema(updateProjectSchema);
export const allocateExpenseBodyJsonSchema = toJsonSchema(allocateExpenseSchema);
export const paginationQueryJsonSchema = toJsonSchema(paginationQuerySchema);

// ==================== ENVELOPE JSON SCHEMAS ====================

export const departmentEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: departmentResponseSchema,
  })
);

export const paginatedDepartmentsEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(departmentResponseSchema),
      pagination: z.object({
        total: z.number(),
        limit: z.number(),
        offset: z.number(),
        hasMore: z.boolean(),
      }),
    }),
  })
);

export const costCenterEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: costCenterResponseSchema,
  })
);

export const paginatedCostCentersEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(costCenterResponseSchema),
      pagination: z.object({
        total: z.number(),
        limit: z.number(),
        offset: z.number(),
        hasMore: z.boolean(),
      }),
    }),
  })
);

export const projectEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: projectResponseSchema,
  })
);

export const paginatedProjectsEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(projectResponseSchema),
      pagination: z.object({
        total: z.number(),
        limit: z.number(),
        offset: z.number(),
        hasMore: z.boolean(),
      }),
    }),
  })
);

export const expenseAllocationListEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.array(expenseAllocationResponseSchema),
  })
);

export const allocationSummaryEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: allocationSummaryResponseSchema,
  })
);

export const baseResponseEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
  })
);
