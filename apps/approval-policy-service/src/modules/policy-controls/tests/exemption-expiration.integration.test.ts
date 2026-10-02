import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { InMemoryEventBus } from '@expense-tracker/core';
import { PrismaClient } from '../../../shared/infrastructure/persistence/prisma.client';
import { WorkspaceId } from '@core/domain/value-objects';
import { PrismaExemptionRepository } from '../infrastructure/persistence/exemption.repository.impl';
import { APPROVAL_POLICY_EVENTS } from '../../../shared/events/approval-policy-events';

const admin = new PrismaClient();
const workerOne = new PrismaClient();
const workerTwo = new PrismaClient();
const workspaceId = randomUUID();
const userId = randomUUID();

describe('Policy exemption PostgreSQL expiration', () => {
  afterAll(async () => {
    await Promise.allSettled([admin.$disconnect(), workerOne.$disconnect(), workerTwo.$disconnect()]);
  });

  it('claims expired exemptions once across workers and writes one outbox event per transition', async () => {
    const policyId = randomUUID();
    const exemptionIds = [randomUUID(), randomUUID(), randomUUID()];
    const now = new Date();
    const pastStart = new Date(now.getTime() - 10 * 86400_000);
    const pastEnd = new Date(now.getTime() - 86400_000);
    const futureEnd = new Date(now.getTime() + 86400_000);

    await admin.expensePolicy.create({
      data: {
        id: policyId,
        workspaceId,
        name: `Expiration test ${policyId}`,
        policyType: 'SPENDING_LIMIT',
        severity: 'MEDIUM',
        configuration: { threshold: 100, currency: 'USD' },
        createdBy: userId,
      },
    });

    try {
      await admin.policyExemption.createMany({
        data: exemptionIds.map((id, index) => ({
          id,
          workspaceId,
          policyId,
          userId,
          requestedBy: userId,
          reason: 'Temporary project policy exemption',
          status: 'APPROVED',
          validFrom: pastStart,
          validUntil: index === 2 ? futureEnd : pastEnd,
        })),
      });

      const bus = new InMemoryEventBus();
      const first = new PrismaExemptionRepository(workerOne, bus);
      const second = new PrismaExemptionRepository(workerTwo, bus);
      const wsId = WorkspaceId.fromString(workspaceId);

      const counts = await Promise.all([
        first.expireExpiredBatch(wsId, now, 1),
        second.expireExpiredBatch(wsId, now, 1),
      ]);

      expect(counts[0] + counts[1]).toBe(2);
      expect(await first.expireExpiredBatch(wsId, now, 10)).toBe(0);

      const rows = await admin.policyExemption.findMany({
        where: { id: { in: exemptionIds } },
      });
      expect(rows.filter((row) => row.status === 'EXPIRED')).toHaveLength(2);
      expect(rows.find((row) => row.id === exemptionIds[2])?.status).toBe('APPROVED');

      const outboxRows = await admin.outboxEvent.findMany({
        where: {
          aggregateId: { in: exemptionIds },
          eventType: APPROVAL_POLICY_EVENTS.EXEMPTION_EXPIRED,
        },
      });
      expect(outboxRows).toHaveLength(2);
      expect(new Set(outboxRows.map((row) => row.aggregateId))).toEqual(
        new Set(exemptionIds.slice(0, 2))
      );
    } finally {
      await admin.outboxEvent.deleteMany({ where: { aggregateId: { in: exemptionIds } } });
      await admin.policyExemption.deleteMany({ where: { id: { in: exemptionIds } } });
      await admin.expensePolicy.delete({ where: { id: policyId } });
    }
  });
});
