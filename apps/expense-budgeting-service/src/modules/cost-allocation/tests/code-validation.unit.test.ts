import { describe, expect, it } from 'vitest';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  createCostCenterSchema,
  updateCostCenterSchema,
  createProjectSchema,
  updateProjectSchema,
  allocateExpenseSchema,
  paginationQuerySchema,
  createProjectBodyJsonSchema,
  updateProjectBodyJsonSchema,
  paginationQueryJsonSchema,
} from '../infrastructure/http/validation/cost-allocation.schema';

describe('cost-allocation HTTP code validation', () => {
  const schemas = [
    [createDepartmentSchema, { name: 'Engineering' }],
    [updateDepartmentSchema, {}],
    [createCostCenterSchema, { name: 'Operations' }],
    [updateCostCenterSchema, {}],
    [createProjectSchema, { name: 'Launch', startDate: '2026-01-01T00:00:00.000Z' }],
    [updateProjectSchema, {}],
  ] as const;

  it('checks code length after trimming for every create and update schema', () => {
    for (const [schema, fields] of schemas) {
      expect(schema.safeParse({ ...fields, code: ' a ' }).success).toBe(false);
      expect(schema.safeParse({ ...fields, code: ' ab ' }).success).toBe(true);
    }
  });

  it('rejects whitespace-only management names in every create and update schema', () => {
    for (const [schema, fields] of schemas) {
      expect(schema.safeParse({ ...fields, name: '  ', code: 'VALID' }).success).toBe(false);
    }
  });

  it('rejects allocation percentages that the domain cannot represent', () => {
    const allocation = { amount: 1, departmentId: '123e4567-e89b-42d3-a456-426614174000' };
    expect(allocateExpenseSchema.safeParse({ allocations: [{ ...allocation, percentage: 12.345 }] }).success).toBe(false);
    expect(allocateExpenseSchema.safeParse({ allocations: [{ ...allocation, percentage: 12.34 }] }).success).toBe(true);
  });

  it('requires ISO date-times for project creation and updates', () => {
    const dateTime = '2026-01-01T00:00:00.000Z';
    expect(createProjectSchema.safeParse({ name: 'Launch', code: 'LAUNCH', startDate: '2026-01-01' }).success).toBe(false);
    expect(createProjectSchema.parse({ name: 'Launch', code: 'LAUNCH', startDate: dateTime }).startDate).toEqual(new Date(dateTime));
    expect(updateProjectSchema.safeParse({ endDate: '2026-12-31' }).success).toBe(false);
    expect(updateProjectSchema.parse({ endDate: null }).endDate).toBeNull();
    expect(updateProjectSchema.parse({ endDate: dateTime }).endDate).toEqual(new Date(dateTime));
    expect(JSON.stringify(createProjectBodyJsonSchema)).toContain('date-time');
    expect(JSON.stringify(updateProjectBodyJsonSchema)).toContain('date-time');
  });

  it('bounds pagination offsets before they reach Prisma', () => {
    expect(paginationQuerySchema.parse({}).offset).toBe(0);
    expect(paginationQuerySchema.parse({ offset: '100000' }).offset).toBe(100_000);
    expect(paginationQuerySchema.safeParse({ offset: '100001' }).success).toBe(false);
    expect(paginationQuerySchema.safeParse({ offset: '2147483648' }).success).toBe(false);
    expect(JSON.stringify(paginationQueryJsonSchema)).toContain('100000');
  });
});
