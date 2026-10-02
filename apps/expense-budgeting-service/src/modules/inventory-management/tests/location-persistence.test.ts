import { randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import type { IEventBus } from '@core/domain/events/domain-event';
import { describe, expect, it, vi } from 'vitest';
import { Location } from '../domain/entities/location.entity';
import { LocationAlreadyExistsError, LocationInUseError } from '../domain/errors/inventory.errors';
import { LocationRepositoryImpl } from '../infrastructure/persistence/location.repository.impl';

describe('location persistence', () => {
  it('writes location and outbox event through one transaction client', async () => {
    const tx = {
      location: { upsert: vi.fn().mockResolvedValue({}) },
      outboxEvent: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
      location: { upsert: vi.fn() },
    } as unknown as PrismaClient;
    const eventBus = { publishAll: vi.fn().mockResolvedValue(undefined) } as unknown as IEventBus;
    const location = Location.create({ workspaceId: randomUUID(), name: 'Main' });

    await new LocationRepositoryImpl(prisma, eventBus).save(location);

    expect(tx.location.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: location.id.getValue(), workspaceId: location.workspaceId },
    }));
    expect(tx.outboxEvent.createMany).toHaveBeenCalledOnce();
    expect(prisma.location.upsert).not.toHaveBeenCalled();
    expect(eventBus.publishAll).toHaveBeenCalledOnce();
  });

  it('does not publish if the outbox write fails', async () => {
    const tx = {
      location: { upsert: vi.fn().mockResolvedValue({}) },
      outboxEvent: { createMany: vi.fn().mockRejectedValue(new Error('outbox failed')) },
    };
    const prisma = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    } as unknown as PrismaClient;
    const eventBus = { publishAll: vi.fn() } as unknown as IEventBus;
    const location = Location.create({ workspaceId: randomUUID(), name: 'Main' });

    await expect(new LocationRepositoryImpl(prisma, eventBus).save(location))
      .rejects.toThrow('outbox failed');
    expect(eventBus.publishAll).not.toHaveBeenCalled();
    expect(location.domainEvents).toHaveLength(1);
  });

  it('translates a concurrent workspace/name conflict', async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002', clientVersion: '5.9.1', meta: { target: ['workspace_id', 'name'] },
    });
    const tx = { location: { upsert: vi.fn().mockRejectedValue(conflict) } };
    const prisma = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    } as unknown as PrismaClient;
    const location = Location.create({ workspaceId: randomUUID(), name: 'Main' });

    await expect(new LocationRepositoryImpl(prisma, { publishAll: vi.fn() } as unknown as IEventBus).save(location))
      .rejects.toThrow(LocationAlreadyExistsError);
  });

  it('returns a conflict when stock or ledger rows reference a location', async () => {
    const foreignKeyError = new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
      code: 'P2003', clientVersion: '5.9.1', meta: { field_name: 'stock_location_id_fkey' },
    });
    const tx = { location: { delete: vi.fn().mockRejectedValue(foreignKeyError) } };
    const prisma = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    } as unknown as PrismaClient;
    const location = Location.create({ workspaceId: randomUUID(), name: 'Main' });
    location.clearDomainEvents();
    location.markAsDeleted();

    await expect(new LocationRepositoryImpl(prisma, { publishAll: vi.fn() } as unknown as IEventBus).delete(location))
      .rejects.toThrow(LocationInUseError);
  });
});
