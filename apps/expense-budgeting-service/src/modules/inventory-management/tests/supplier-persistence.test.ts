import { randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import type { IEventBus } from '@core/domain/events/domain-event';
import { describe, expect, it, vi } from 'vitest';
import { SupplierAlreadyExistsError, SupplierInUseError } from '../domain/errors/inventory.errors';
import { Supplier } from '../domain/entities/supplier.entity';
import { SupplierRepositoryImpl } from '../infrastructure/persistence/supplier.repository.impl';

describe('supplier persistence', () => {
  it('writes supplier and outbox event through one transaction client', async () => {
    const tx = {
      supplier: { upsert: vi.fn().mockResolvedValue({}) },
      outboxEvent: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
      supplier: { upsert: vi.fn() },
    } as unknown as PrismaClient;
    const eventBus = { publishAll: vi.fn().mockResolvedValue(undefined) } as unknown as IEventBus;
    const supplier = Supplier.create({ workspaceId: randomUUID(), name: 'Acme' });

    await new SupplierRepositoryImpl(prisma, eventBus).save(supplier);

    expect(tx.supplier.upsert).toHaveBeenCalledOnce();
    expect(tx.supplier.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: supplier.id.getValue(), workspaceId: supplier.workspaceId },
    }));
    expect(tx.outboxEvent.createMany).toHaveBeenCalledOnce();
    expect(prisma.supplier.upsert).not.toHaveBeenCalled();
    expect(eventBus.publishAll).toHaveBeenCalledOnce();
  });

  it('does not publish when the outbox write fails', async () => {
    const tx = {
      supplier: { upsert: vi.fn().mockResolvedValue({}) },
      outboxEvent: { createMany: vi.fn().mockRejectedValue(new Error('outbox failed')) },
    };
    const prisma = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    } as unknown as PrismaClient;
    const eventBus = { publishAll: vi.fn().mockResolvedValue(undefined) } as unknown as IEventBus;
    const supplier = Supplier.create({ workspaceId: randomUUID(), name: 'Acme' });

    await expect(new SupplierRepositoryImpl(prisma, eventBus).save(supplier))
      .rejects.toThrow('outbox failed');
    expect(eventBus.publishAll).not.toHaveBeenCalled();
    expect(supplier.domainEvents).toHaveLength(1);
  });

  it('translates a concurrent workspace/name uniqueness conflict', async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002', clientVersion: '5.9.1', meta: { target: ['workspace_id', 'name'] },
    });
    const tx = { supplier: { upsert: vi.fn().mockRejectedValue(conflict) } };
    const prisma = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    } as unknown as PrismaClient;
    const eventBus = { publishAll: vi.fn() } as unknown as IEventBus;
    const supplier = Supplier.create({ workspaceId: randomUUID(), name: 'Acme' });

    await expect(new SupplierRepositoryImpl(prisma, eventBus).save(supplier))
      .rejects.toThrow(SupplierAlreadyExistsError);
  });

  it('returns a conflict when a purchase order still references the supplier', async () => {
    const foreignKeyError = new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
      code: 'P2003', clientVersion: '5.9.1',
      meta: { field_name: 'purchase_order_supplier_id_fkey' },
    });
    const tx = { supplier: { delete: vi.fn().mockRejectedValue(foreignKeyError) } };
    const prisma = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    } as unknown as PrismaClient;
    const eventBus = { publishAll: vi.fn() } as unknown as IEventBus;
    const supplier = Supplier.create({ workspaceId: randomUUID(), name: 'Acme' });
    supplier.clearDomainEvents();
    supplier.markAsDeleted();

    await expect(new SupplierRepositoryImpl(prisma, eventBus).delete(supplier))
      .rejects.toThrow(SupplierInUseError);
    expect(eventBus.publishAll).not.toHaveBeenCalled();
  });
});
