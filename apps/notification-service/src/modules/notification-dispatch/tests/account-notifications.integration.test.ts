import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '../../../prisma-client';
import { buildNotificationApp } from '../../../app';
import { AccountNotification } from '../domain/entities/account-notification.entity';
import { AccountNotificationRepositoryImpl } from '../infrastructure/persistence/account-notification.repository.impl';
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
  process.env.NOTIFICATION_TEST_DATABASE_URL &&
  process.env.NOTIFICATION_TEST_DATABASE_URL === process.env.DATABASE_URL
);
describe.skipIf(!enabled)(
  'account notification acceptance, preferences and ownership',
  () => {
    const prisma = new PrismaClient(),
      userId = randomUUID(),
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
    const post = (
      payload: object,
      headers: Record<string, string> = { 'x-internal-api-key': key }
    ) =>
      app.inject({
        method: 'POST',
        url: '/api/v1/event-outbox/events',
        headers,
        payload,
      });
    const actor = (id: string = userId) => ({
      'x-internal-api-key': key,
      'x-user-id': id,
    });
    beforeAll(async () => {
      app = await buildNotificationApp({ logger: false });
    });
    afterAll(async () => {
      const rows = await prisma.accountNotification.findMany({
        where: { userId: { in: [userId, otherUser] } },
        select: { id: true },
      });
      await prisma.outboxEvent.deleteMany({
        where: { aggregateId: { in: rows.map((row) => row.id) } },
      });
      await prisma.accountNotification.deleteMany({
        where: { userId: { in: [userId, otherUser] } },
      });
      await prisma.accountNotificationRequest.deleteMany({
        where: { userId: { in: [userId, otherUser] } },
      });
      await prisma.accountNotificationPreference.deleteMany({
        where: { userId: { in: [userId, otherUser] } },
      });
      await prisma.outboxEvent.deleteMany({
        where: { payload: { path: ['workspaceId'], equals: workspaceId } },
      });
      await prisma.notification.deleteMany({ where: { workspaceId } });
      await prisma.notificationRequest.deleteMany({ where: { workspaceId } });
      await prisma.notificationPreference.deleteMany({
        where: { workspaceId },
      });
      await app?.close();
      await prisma.$disconnect();
    });
    it.each(events)(
      'accepts the actual $eventType Identity payload, with one record and outbox event',
      async (event) => {
        const payload = envelope(event);
        expect((await post(payload)).statusCode).toBe(201);
        expect((await post(payload)).statusCode).toBe(200);
        expect(
          await prisma.accountNotification.count({
            where: { id: event.eventId, userId },
          })
        ).toBe(1);
        expect(
          await prisma.outboxEvent.count({
            where: {
              aggregateId: event.eventId,
              eventType: 'account.notification.created',
            },
          })
        ).toBe(1);
        expect(
          await prisma.notification.count({ where: { id: event.eventId } })
        ).toBe(0);
      }
    );
    it('serializes concurrent duplicate delivery and rejects changed content', async () => {
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
    it('preserves suppression receipts after preference changes and honors per-event settings', async () => {
      const put = (body: object) =>
        app.inject({
          method: 'PUT',
          url: '/api/v1/account/notification-preferences',
          headers: actor(),
          payload: body,
        });
      expect((await put({ inAppEnabled: false })).statusCode).toBe(200);
      const payload = { ...envelope(), eventId: randomUUID() };
      expect((await post(payload)).json()).toMatchObject({
        suppressed: true,
        duplicate: false,
      });
      expect(
        await prisma.accountNotification.count({
          where: { id: payload.eventId },
        })
      ).toBe(0);
      expect(
        (
          await put({
            inAppEnabled: true,
            typeSettings: { 'identity.user_password_changed': false },
          })
        ).statusCode
      ).toBe(200);
      expect((await post(payload)).json()).toMatchObject({
        suppressed: true,
        duplicate: true,
      });
      const password = { ...envelope(events[2]), eventId: randomUUID() };
      expect((await post(password)).json().suppressed).toBe(true);
      expect((await put({ inAppEnabled: true })).statusCode).toBe(200);
      expect((await put({ inAppEnabled: 'false' })).statusCode).toBe(400);
      expect(
        (await put({ inAppEnabled: true, userId: otherUser })).statusCode
      ).toBe(400);
      expect(
        (await put({ inAppEnabled: true, typeSettings: { arbitrary: false } }))
          .statusCode
      ).toBe(400);
    });
    it('isolates reads and preferences by actor, and makes read marking idempotent', async () => {
      const mine = await app.inject({
        method: 'GET',
        url: '/api/v1/account/notifications',
        headers: actor(),
      });
      expect(mine.statusCode).toBe(200);
      expect(mine.json().data.total).toBeGreaterThanOrEqual(7);
      const outsider = await app.inject({
        method: 'GET',
        url: '/api/v1/account/notifications',
        headers: actor(otherUser),
      });
      expect(outsider.json().data.total).toBe(0);
      expect(
        (
          await app.inject({
            method: 'GET',
            url: `/api/v1/account/notifications?userId=${userId}`,
            headers: actor(otherUser),
          })
        ).statusCode
      ).toBe(400);
      const id = events[0].eventId;
      const mark = (who: string) =>
        app.inject({
          method: 'PATCH',
          url: `/api/v1/account/notifications/${id}/read`,
          headers: actor(who),
        });
      expect((await mark(otherUser)).statusCode).toBe(404);
      expect((await mark(userId)).statusCode).toBe(200);
      expect((await mark(userId)).statusCode).toBe(200);
      expect(
        await prisma.outboxEvent.count({
          where: { aggregateId: id, eventType: 'account.notification.read' },
        })
      ).toBe(1);
      expect(
        (
          await app.inject({
            method: 'PUT',
            url: '/api/v1/account/notification-preferences',
            headers: actor(otherUser),
            payload: { inAppEnabled: false },
          })
        ).statusCode
      ).toBe(200);
      expect(
        (
          await app.inject({
            method: 'GET',
            url: '/api/v1/account/notification-preferences',
            headers: actor(),
          })
        ).json().data.inAppEnabled
      ).toBe(true);
    });
    it('requires internal authentication and valid actors and rejects scope contradictions', async () => {
      expect((await post(envelope(), {})).statusCode).toBe(403);
      expect(
        (
          await app.inject({
            method: 'GET',
            url: '/api/v1/account/notifications',
            headers: { 'x-internal-api-key': key },
          })
        ).statusCode
      ).toBe(401);
      expect(
        (await post({ ...envelope(), aggregateId: otherUser })).statusCode
      ).toBe(400);
      expect(
        (await post({ ...envelope(), payload: { userId, workspaceId } }))
          .statusCode
      ).toBe(400);
      expect(
        (
          await post({
            ...envelope(),
            eventType: 'Unknown',
            aggregateType: 'Unknown',
          })
        ).statusCode
      ).toBe(400);
    });
    it('rejects event ID reuse across account and workspace scopes in both directions', async () => {
      const payload = { ...envelope(), eventId: randomUUID() };
      expect((await post(payload)).statusCode).toBe(201);
      const workspace = {
        eventId: payload.eventId,
        eventType: 'expense.approved',
        aggregateType: 'Expense',
        aggregateId: randomUUID(),
        payload: { workspaceId, userId },
      };
      expect((await post(workspace)).statusCode).toBe(409);
      const reverse = randomUUID();
      expect((await post({ ...workspace, eventId: reverse })).statusCode).toBe(
        201
      );
      expect((await post({ ...payload, eventId: reverse })).statusCode).toBe(
        409
      );
    });
    it('keeps account and workspace preferences independent', async () => {
      await prisma.notificationPreference.create({
        data: { userId, workspaceId, inAppEnabled: false },
      });
      expect(
        (await post({ ...envelope(), eventId: randomUUID() })).statusCode
      ).toBe(201);
      await prisma.accountNotificationPreference.upsert({
        where: { userId },
        create: { userId, inAppEnabled: false },
        update: { inAppEnabled: false },
      });
      await prisma.notificationPreference.update({
        where: { userId_workspaceId: { userId, workspaceId } },
        data: { inAppEnabled: true },
      });
      const event = {
        eventId: randomUUID(),
        eventType: 'expense.approved',
        aggregateType: 'Expense',
        aggregateId: randomUUID(),
        payload: { userId, workspaceId },
      };
      expect((await post(event)).statusCode).toBe(201);
      await prisma.accountNotificationPreference.update({
        where: { userId },
        data: { inAppEnabled: true },
      });
    });
    it('enforces receipt ownership in PostgreSQL', async () => {
      const id = randomUUID();
      await prisma.accountNotificationRequest.create({
        data: { id, userId, fingerprint: 'a'.repeat(64), suppressed: false },
      });
      await expect(
        prisma.accountNotification.create({
          data: {
            id,
            userId: otherUser,
            eventType: 'identity.user_created',
            title: 'Welcome',
            content: 'Welcome',
            createdAt: new Date(),
          },
        })
      ).rejects.toMatchObject({ code: 'P2003' });
    });
    it('rolls back receipt and notification creation if the outbox insert fails', async () => {
      const id = randomUUID();
      await prisma.$executeRawUnsafe(`CREATE FUNCTION notification_dispatch.reject_account_outbox() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.aggregate_id = '${id}' THEN RAISE EXCEPTION 'controlled account outbox failure'; END IF; RETURN NEW; END $$`);
      await prisma.$executeRawUnsafe(
        'CREATE TRIGGER reject_account_outbox BEFORE INSERT ON notification_dispatch.outbox_event FOR EACH ROW EXECUTE FUNCTION notification_dispatch.reject_account_outbox()'
      );
      try {
        const repository = new AccountNotificationRepositoryImpl(prisma);
        await expect(
          repository.accept(
            AccountNotification.create(
              id,
              userId,
              'identity.user_created',
              new Date()
            ),
            'a'.repeat(64)
          )
        ).rejects.toThrow();
        expect(
          await prisma.accountNotification.findUnique({ where: { id } })
        ).toBeNull();
        expect(
          await prisma.accountNotificationRequest.findUnique({ where: { id } })
        ).toBeNull();
      } finally {
        await prisma.$executeRawUnsafe(
          'DROP TRIGGER reject_account_outbox ON notification_dispatch.outbox_event'
        );
        await prisma.$executeRawUnsafe(
          'DROP FUNCTION notification_dispatch.reject_account_outbox()'
        );
      }
    });
  }
);
