import type { PrismaClient } from '@prisma/client';
import type { IEventBus } from '@core/domain/events/domain-event';
import { describe, expect, it, vi } from 'vitest';
import { ListTransactionsHandler } from '../application/queries/list-transactions.query';
import type { StockService } from '../application/services/stock.service';
import { InventoryTransactionRepositoryImpl } from '../infrastructure/persistence/inventory-transaction.repository.impl';
import {
  listQuerySchema,
  listPurchaseOrdersQuerySchema,
  listStockQuerySchema,
  listTransactionsQuerySchema,
} from '../infrastructure/http/validation/inventory.schema';

describe('inventory queries', () => {
  it('passes both transaction filters and pagination to the read service', async () => {
    const result = { items: [], total: 0, limit: 10, offset: 5, hasMore: false };
    const getTransactionsByFilters = vi.fn().mockResolvedValue(result);
    const handler = new ListTransactionsHandler({ getTransactionsByFilters } as unknown as StockService);

    await expect(handler.handle({
      workspaceId: 'workspace', variantId: 'variant', locationId: 'location', limit: 10, offset: 5,
    })).resolves.toEqual(result);
    expect(getTransactionsByFilters).toHaveBeenCalledWith(
      { workspaceId: 'workspace', variantId: 'variant', locationId: 'location' },
      { limit: 10, offset: 5 }
    );
  });

  it('applies workspace and both filters in the database query', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const prisma = { inventoryTransaction: { findMany, count } } as unknown as PrismaClient;
    const repository = new InventoryTransactionRepositoryImpl(prisma, {} as IEventBus);

    await repository.findByFilters(
      { workspaceId: 'workspace', variantId: 'variant', locationId: 'location' },
      { limit: 10, offset: 5 }
    );

    const where = { workspaceId: 'workspace', variantId: 'variant', locationId: 'location' };
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where, take: 10, skip: 5,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }));
    expect(count).toHaveBeenCalledWith({ where });
  });

  it('rejects blank transaction variants and impractical offsets', () => {
    expect(listTransactionsQuerySchema.safeParse({ variantId: '   ' }).success).toBe(false);
    expect(listTransactionsQuerySchema.safeParse({ variantId: ' widget ', offset: '12' }).data)
      .toEqual({ variantId: 'widget', offset: 12 });
    for (const schema of [
      listQuerySchema,
      listPurchaseOrdersQuerySchema,
      listStockQuerySchema,
      listTransactionsQuerySchema,
    ]) {
      expect(schema.safeParse({ offset: '1000001' }).success).toBe(false);
    }
  });
});
