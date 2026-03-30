import { z } from 'zod';

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

export const createDepartmentSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20),
  description: z.string().optional(),
  managerId: z.string().uuid().optional(),
  parentDepartmentId: z.string().uuid().optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  code: z.string().min(2).max(20).optional(),
  description: z.string().nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  parentDepartmentId: z.string().uuid().nullable().optional(),
});

// ==================== COST CENTER SCHEMAS ====================

export const createCostCenterSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20),
  description: z.string().optional(),
});

export const updateCostCenterSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  code: z.string().min(2).max(20).optional(),
  description: z.string().nullable().optional(),
});

// ==================== PROJECT SCHEMAS ====================

export const createProjectSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20),
  startDate: z.coerce.date(),
  description: z.string().optional(),
  endDate: z.coerce.date().optional(),
  managerId: z.string().uuid().optional(),
  budget: z.coerce.number().min(0).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  code: z.string().min(2).max(20).optional(),
  description: z.string().nullable().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  budget: z.coerce.number().min(0).nullable().optional(),
});

// ==================== EXPENSE ALLOCATION SCHEMAS ====================

export const allocateExpenseSchema = z.object({
  allocations: z.array(
    z.object({
      amount: z.coerce.number().min(0.01),
      percentage: z.coerce.number().min(0).max(100).optional(),
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
  offset: z.coerce.number().int().min(0).optional().default(0),
});
