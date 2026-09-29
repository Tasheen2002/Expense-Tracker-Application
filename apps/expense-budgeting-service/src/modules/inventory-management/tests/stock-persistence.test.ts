import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type { IEventBus } from '@core/domain/events/domain-event';
import { describe, expect, it, vi } from 'vitest';
import { Stock } from '../domain/entities/stock.entity';
import { StockRepositoryImpl } from '../infrastructure/persistence/stock.repository.impl';

describe('stock persistence', () => {
  it('saves stock and outbox events in one transaction', async () => {
    const tx = {
      stock: { upsert: vi.fn().mockResolvedValue({}) },
      outboxEvent: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
      stock: { upsert: vi.fn() },
    } as unknown as PrismaClient;
    const eventBus = { publishAll: vi.fn().mockResolvedValue(undefined) } as unknown as IEventBus;
    const stock = Stock.create({ workspaceId: randomUUID(), locationId: randomUUID(), variantId: 'widget' });

    await new StockRepositoryImpl(prisma, eventBus).save(stock);

    expect(tx.stock.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: stock.id.getValue(), workspaceId: stock.workspaceId },
    }));
    expect(tx.outboxEvent.createMany).toHaveBeenCalledOnce();
    expect(prisma.stock.upsert).not.toHaveBeenCalled();
    expect(eventBus.publishAll).toHaveBeenCalledOnce();
  });

  it('does not publish if the outbox write fails', async () => {
    const tx = {
      stock: { upsert: vi.fn().mockResolvedValue({}) },
      outboxEvent: { createMany: vi.fn().mockRejectedValue(new Error('outbox failed')) },
    };
    const prisma = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    } as unknown as PrismaClient;
    const eventBus = { publishAll: vi.fn() } as unknown as IEventBus;
    const stock = Stock.create({ workspaceId: randomUUID(), locationId: randomUUID(), variantId: 'widget' });

    await expect(new StockRepositoryImpl(prisma, eventBus).save(stock))
      .rejects.toThrow('outbox failed');
    expect(eventBus.publishAll).not.toHaveBeenCalled();
    expect(stock.domainEvents).toHaveLength(1);
  });
});
