import { Prisma, PrismaClient } from '@prisma/client';
import {
  AllocationGroupData,
  AllocationSummarySnapshot,
  IAllocationSummaryPort,
} from '../../application/ports/allocation-summary.port';

export class PrismaAllocationSummaryAdapter implements IAllocationSummaryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async getSnapshot(workspaceId: string): Promise<AllocationSummarySnapshot> {
    return this.prisma.$transaction(async (tx) => {
      const [byDepartment, byCostCenter, byProject, totalAllocations] = await Promise.all([
        tx.$queryRaw<AllocationGroupData[]>`
          SELECT a.department_id AS "targetId", d.name AS "targetName", e.currency,
            SUM(a.amount) AS total, COUNT(*)::integer AS count
          FROM "cost_allocation"."expense_allocations" a
          JOIN "expense_ledger"."expenses" e
            ON e.id = a.expense_id AND e.workspace_id = a.workspace_id
          JOIN "cost_allocation"."departments" d
            ON d.id = a.department_id AND d.workspace_id = a.workspace_id
          WHERE a.workspace_id = ${workspaceId}::uuid AND a.department_id IS NOT NULL
          GROUP BY a.department_id, d.name, e.currency
          ORDER BY a.department_id, e.currency
        `,
        tx.$queryRaw<AllocationGroupData[]>`
          SELECT a.cost_center_id AS "targetId", c.name AS "targetName", e.currency,
            SUM(a.amount) AS total, COUNT(*)::integer AS count
          FROM "cost_allocation"."expense_allocations" a
          JOIN "expense_ledger"."expenses" e
            ON e.id = a.expense_id AND e.workspace_id = a.workspace_id
          JOIN "cost_allocation"."cost_centers" c
            ON c.id = a.cost_center_id AND c.workspace_id = a.workspace_id
          WHERE a.workspace_id = ${workspaceId}::uuid AND a.cost_center_id IS NOT NULL
          GROUP BY a.cost_center_id, c.name, e.currency
          ORDER BY a.cost_center_id, e.currency
        `,
        tx.$queryRaw<AllocationGroupData[]>`
          SELECT a.project_id AS "targetId", p.name AS "targetName", e.currency,
            SUM(a.amount) AS total, COUNT(*)::integer AS count
          FROM "cost_allocation"."expense_allocations" a
          JOIN "expense_ledger"."expenses" e
            ON e.id = a.expense_id AND e.workspace_id = a.workspace_id
          JOIN "cost_allocation"."projects" p
            ON p.id = a.project_id AND p.workspace_id = a.workspace_id
          WHERE a.workspace_id = ${workspaceId}::uuid AND a.project_id IS NOT NULL
          GROUP BY a.project_id, p.name, e.currency
          ORDER BY a.project_id, e.currency
        `,
        tx.expenseAllocation.count({ where: { workspaceId } }),
      ]);

      return { totalAllocations, byDepartment, byCostCenter, byProject };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
}
