import { describe, it, expect, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createCompositionRoot, CompositionRoot } from '../../../composition-root';
import { buildExpenseApp } from '../../../app';

describe('Composition Root — Typed Factory Pattern (Unit)', () => {
  const createMockPrisma = () =>
    ({
      $queryRaw: vi.fn(),
      $transaction: vi.fn(),
      expense: { findUnique: vi.fn(), create: vi.fn() },
      category: { findUnique: vi.fn(), create: vi.fn() },
      tag: { findUnique: vi.fn(), create: vi.fn() },
      attachment: { findUnique: vi.fn(), create: vi.fn() },
      recurringExpense: { findUnique: vi.fn(), create: vi.fn() },
      expenseSplit: { findUnique: vi.fn(), create: vi.fn() },
      splitSettlement: { findUnique: vi.fn(), create: vi.fn() },
      budget: { findUnique: vi.fn(), create: vi.fn() },
      budgetAllocation: { findUnique: vi.fn(), create: vi.fn() },
      budgetAlert: { findUnique: vi.fn(), create: vi.fn() },
      spendingLimit: { findUnique: vi.fn(), create: vi.fn() },
      budgetPlan: { findUnique: vi.fn(), create: vi.fn() },
      forecast: { findUnique: vi.fn(), create: vi.fn() },
      scenario: { findUnique: vi.fn(), create: vi.fn() },
      forecastItem: { findUnique: vi.fn(), create: vi.fn() },
      department: { findUnique: vi.fn(), create: vi.fn() },
      costCenter: { findUnique: vi.fn(), create: vi.fn() },
      project: { findUnique: vi.fn(), create: vi.fn() },
      expenseAllocation: { findUnique: vi.fn(), create: vi.fn() },
      supplier: { findUnique: vi.fn(), create: vi.fn() },
      location: { findUnique: vi.fn(), create: vi.fn() },
      purchaseOrder: { findUnique: vi.fn(), create: vi.fn() },
      stock: { findUnique: vi.fn(), create: vi.fn() },
      inventoryTransaction: { findUnique: vi.fn(), create: vi.fn() },
      outboxEvent: { findMany: vi.fn(), updateMany: vi.fn() },
    } as unknown as PrismaClient);

  it('fails fast if PrismaClient is missing', () => {
    expect(() => createCompositionRoot(null as unknown as PrismaClient)).toThrow(
      '[CompositionRoot] FATAL: A valid PrismaClient instance must be provided.'
    );
  });

  it('constructs a strongly-typed graph with frozen public surfaces and zero string lookups', () => {
    const mockPrisma = createMockPrisma();
    const root = createCompositionRoot(mockPrisma);

    expect(root).toBeDefined();
    expect(root.expenseLedger).toBeDefined();
    expect(root.expenseLedger.expenseController).toBeDefined();
    expect(root.expenseLedger.categoryController).toBeDefined();
    expect(root.expenseLedger.tagController).toBeDefined();
    expect(root.expenseLedger.attachmentController).toBeDefined();
    expect(root.expenseLedger.recurringExpenseController).toBeDefined();
    expect(root.expenseLedger.expenseSplitController).toBeDefined();

    expect(root.budgetManagement).toBeDefined();
    expect(root.budgetManagement.budgetController).toBeDefined();
    expect(root.budgetManagement.spendingLimitController).toBeDefined();

    expect(root.budgetPlanning).toBeDefined();
    expect(root.budgetPlanning.budgetPlanController).toBeDefined();

    expect(root.costAllocation).toBeDefined();
    expect(root.costAllocation.allocationManagementController).toBeDefined();

    expect(root.inventoryManagement).toBeDefined();
    expect(root.inventoryManagement.supplierController).toBeDefined();

    expect(root.outboxEventRepository).toBeDefined();

    // Verify public surfaces are frozen (immutable)
    expect(Object.isFrozen(root)).toBe(true);
    expect(Object.isFrozen(root.expenseLedger)).toBe(true);
    expect(Object.isFrozen(root.budgetManagement)).toBe(true);
    expect(Object.isFrozen(root.budgetPlanning)).toBe(true);
    expect(Object.isFrozen(root.costAllocation)).toBe(true);
    expect(Object.isFrozen(root.inventoryManagement)).toBe(true);
  });

  it('guarantees isolated, independent dependency graphs across multiple calls (zero singleton state)', () => {
    const mockPrisma1 = createMockPrisma();
    const mockPrisma2 = createMockPrisma();

    const root1 = createCompositionRoot(mockPrisma1);
    const root2 = createCompositionRoot(mockPrisma2);

    expect(root1).not.toBe(root2);
    expect(root1.expenseLedger).not.toBe(root2.expenseLedger);
    expect(root1.expenseLedger.expenseController).not.toBe(root2.expenseLedger.expenseController);
    expect(root1.budgetManagement).not.toBe(root2.budgetManagement);
    expect(root1.outboxEventRepository).not.toBe(root2.outboxEventRepository);
  });

  it('injects custom compositionRootFactory into buildExpenseApp tied to Fastify prisma lifecycle', async () => {
    let factoryCalledWithPrisma: PrismaClient | null = null;

    const mockFactory = vi.fn((prisma: PrismaClient): CompositionRoot => {
      factoryCalledWithPrisma = prisma;
      return createCompositionRoot(prisma);
    });

    const app = await buildExpenseApp({
      enableInternalAuth: false,
      logger: false,
      compositionRootFactory: mockFactory,
    });

    expect(mockFactory).toHaveBeenCalledOnce();
    expect(factoryCalledWithPrisma).toBe(app.prisma);
    expect(app.compositionRoot).toBeDefined();
    expect(app.compositionRoot.expenseLedger).toBeDefined();

    await app.close();
  });
});
