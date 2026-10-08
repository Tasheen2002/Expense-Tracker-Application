import { PrismaClient } from '@prisma/client';

/** Resolve required schemas/tables without scanning data. */
export async function verifyDatabaseReadiness(prisma: Pick<PrismaClient, '$queryRaw'>): Promise<void> {
  await prisma.$queryRaw`SELECT 1 FROM expense_ledger.expenses e, budget_management.budgets b, budget_planning.budget_plans p, cost_allocation.departments d, inventory_management.supplier s, expense_ledger.outbox_event o LIMIT 0`;
}
