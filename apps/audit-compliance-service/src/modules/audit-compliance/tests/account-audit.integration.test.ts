import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { buildAuditComplianceApp } from '../../../app';
import type { FastifyInstance } from 'fastify';
import {
  UserCreatedEvent,
  UserEmailVerifiedEvent,
  UserPasswordChangedEvent,
  UserEmailChangedEvent,
  UserDeactivatedEvent,
  UserActivatedEvent,
  UserProfileUpdatedEvent,
} from '../../../../../identity-access-service/src/modules/identity-workspace/domain/entities/user.entity';
const enabled = Boolean(
  process.env.AUDIT_DATABASE_URL &&
  process.env.AUDIT_DATABASE_URL === process.env.DATABASE_URL
);
describe.skipIf(!enabled)(
  'account audit producer/receiver and ownership contracts',
  () => {
    const prisma = new PrismaClient();
    const userId = randomUUID(),
      otherUser = randomUUID(),
      workspaceId = randomUUID();
    const key = process.env.INTERNAL_API_KEY!;
    let app: FastifyInstance;
    const events = [
      new UserCreatedEvent(userId, 'account@example.test', null),
      new UserEmailVerifiedEvent(userId, 'account@example.test'),
      new UserPasswordChangedEvent(userId),
      new UserEmailChangedEvent(userId, 'changed@example.test'),
      new UserDeactivatedEvent(userId),
      new UserActivatedEvent(userId),
      new UserProfileUpdatedEvent(userId, 'Updated'),
    ];
    const envelope = (event = events[0]) => ({
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      payload: event.getPayload(),
      timestamp: event.occurredAt.toISOString(),
    });
    const post = (payload: object) =>
      app.inject({
        method: 'POST',
        url: '/api/v1/event-outbox/events',
        headers: { 'x-internal-api-key': key },
        payload,
      });
    beforeAll(async () => {
      app = await buildAuditComplianceApp({ logger: false });
    });
    afterAll(async () => {
      await prisma.accountAuditLog.deleteMany({ where: { userId } });
      await prisma.auditLog.deleteMany({ where: { workspaceId } });
      await app?.close();
      await prisma.$disconnect();
    });
    it.each(events)(
      'persists $eventType emitted by Identity without a workspace',
      async (event) => {
        const payload = envelope(event);
        expect((await post(payload)).statusCode).toBe(201);
        expect((await post(payload)).statusCode).toBe(200);
        expect(
          await prisma.accountAuditLog.count({
            where: { id: event.eventId, userId },
          })
        ).toBe(1);
        expect(
          await prisma.auditLog.count({ where: { id: event.eventId } })
        ).toBe(0);
      }
    );
    it('serializes concurrent first deliveries and rejects conflicting payloads', async () => {
      const payload = { ...envelope(), eventId: randomUUID() };
      const responses = await Promise.all(
        Array.from({ length: 8 }, () => post(payload))
      );
      expect(responses.filter((r) => r.statusCode === 201)).toHaveLength(1);
      expect(responses.filter((r) => r.statusCode === 200)).toHaveLength(7);
      expect(
        (
          await post({
            ...payload,
            payload: { ...payload.payload, fullName: 'conflict' },
          })
        ).statusCode
      ).toBe(409);
    });
    it('rejects account/workspace event ID reuse in both directions', async () => {
      const account = { ...envelope(), eventId: randomUUID() };
      expect((await post(account)).statusCode).toBe(201);
      const workspace = {
        eventId: account.eventId,
        eventType: 'expense.created',
        aggregateType: 'Expense',
        aggregateId: randomUUID(),
        payload: { workspaceId, userId },
      };
      expect((await post(workspace)).statusCode).toBe(409);
      const reverse = randomUUID();
      expect((await post({ ...workspace, eventId: reverse })).statusCode).toBe(
        201
      );
      expect((await post({ ...account, eventId: reverse })).statusCode).toBe(
        409
      );
    });
    it('isolates account reads by verified actor and rejects caller-selected owners', async () => {
      const get = (user: string, suffix = '') =>
        app.inject({
          method: 'GET',
          url: '/api/v1/account/audit-logs' + suffix,
          headers: { 'x-internal-api-key': key, 'x-user-id': user },
        });
      const mine = await get(userId);
      expect(mine.statusCode).toBe(200);
      expect(mine.json().data.items.length).toBeGreaterThanOrEqual(7);
      expect(
        mine
          .json()
          .data.items.every(
            (row: { userId: string; scope: string }) =>
              row.userId === userId && row.scope === 'account'
          )
      ).toBe(true);
      expect((await get(otherUser)).json().data.total).toBe(0);
      expect((await get(otherUser, `?userId=${userId}`)).statusCode).toBe(400);
      expect((await get(userId, '?offset=2147483648')).statusCode).toBe(400);
      expect(
        (
          await app.inject({
            method: 'GET',
            url: '/api/v1/account/audit-logs',
            headers: { 'x-internal-api-key': key },
          })
        ).statusCode
      ).toBe(401);
      expect(
        (
          await app.inject({
            method: 'GET',
            url: '/api/v1/account/audit-logs',
            headers: { 'x-user-id': userId },
          })
        ).statusCode
      ).toBe(403);
    });
    it('keeps arbitrary missing-workspace and contradictory account events invalid', async () => {
      expect(
        (
          await post({
            ...envelope(),
            eventType: 'Unknown',
            aggregateType: 'Unknown',
          })
        ).statusCode
      ).toBe(400);
      expect(
        (await post({ ...envelope(), payload: { userId, workspaceId } }))
          .statusCode
      ).toBe(400);
      expect(
        (await post({ ...envelope(), aggregateId: otherUser })).statusCode
      ).toBe(400);
    });
  }
);
