import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  accountEventOwner,
  accountLifecycleAliases,
  accountEventEnvelopeSchema,
  canonicalEventJson,
} from '../contracts/src/account-events';
import { UserCreatedEventSchema } from '../contracts/src';
import {
  UserCreatedEvent,
  UserEmailVerifiedEvent,
  UserPasswordChangedEvent,
  UserEmailChangedEvent,
  UserDeactivatedEvent,
  UserActivatedEvent,
  UserProfileUpdatedEvent,
} from '../../apps/identity-access-service/src/modules/identity-workspace/domain/entities/user.entity';
const userId = randomUUID();
const events = [
  new UserCreatedEvent(userId, 'account@example.test', null),
  new UserEmailVerifiedEvent(userId, 'account@example.test'),
  new UserPasswordChangedEvent(userId),
  new UserEmailChangedEvent(userId, 'changed@example.test'),
  new UserDeactivatedEvent(userId),
  new UserActivatedEvent(userId),
  new UserProfileUpdatedEvent(userId, 'New name'),
];
describe('account producer contracts', () => {
  it.each(events)(
    'recognizes the actual $eventType producer payload without a workspace',
    (event) => {
      const envelope = accountEventEnvelopeSchema.parse({
        eventId: event.eventId,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        payload: event.getPayload(),
        timestamp: event.occurredAt.toISOString(),
      });
      expect(accountEventOwner(envelope)).toBe(userId);
      expect(
        accountEventOwner({
          ...envelope,
          eventType:
            accountLifecycleAliases[
              event.eventType as keyof typeof accountLifecycleAliases
            ],
        })
      ).toBe(userId);
    }
  );
  it('does not infer account scope from missing workspace on an unknown event', () => {
    expect(
      accountEventOwner({
        eventId: randomUUID(),
        eventType: 'expense.created',
        payload: { userId },
      })
    ).toBeNull();
  });
  it.each([
    { aggregateType: 'Workspace' },
    { aggregateId: randomUUID() },
    { payload: { userId, workspaceId: randomUUID() } },
    { payload: { userId, accountId: randomUUID() } },
    { payload: { userId: 'invalid' } },
  ])('rejects contradictory account identifiers or scope', (patch) => {
    expect(() =>
      accountEventOwner({
        eventId: randomUUID(),
        eventType: 'UserCreated',
        aggregateId: userId,
        aggregateType: 'User',
        payload: { userId },
        ...patch,
      })
    ).toThrow();
  });
  it('requires explicit scope and matching IDs on account notification events', () => {
    const id = randomUUID();
    const event = {
      eventId: randomUUID(),
      eventType: 'account.notification.created',
      aggregateId: id,
      aggregateType: 'AccountNotification',
      payload: {
        scope: 'account',
        userId,
        accountId: userId,
        notificationId: id,
      },
    };
    expect(accountEventOwner(event)).toBe(userId);
    expect(() =>
      accountEventOwner({
        ...event,
        payload: { ...event.payload, scope: 'workspace' },
      })
    ).toThrow();
  });
  it('defines UserCreated as an account event in the public contract too', () => {
    const data = {
      eventId: randomUUID(),
      eventType: 'UserCreated',
      timestamp: new Date(),
      data: events[0].getPayload(),
    };
    expect(UserCreatedEventSchema.parse(data).scope).toBe('account');
    expect(
      UserCreatedEventSchema.safeParse({ ...data, workspaceId: randomUUID() })
        .success
    ).toBe(false);
  });
  it('canonicalizes nested object order without changing array order', () => {
    expect(canonicalEventJson({ z: { b: 2, a: 1 }, a: [2, 1] })).toBe(
      canonicalEventJson({ a: [2, 1], z: { a: 1, b: 2 } })
    );
    expect(canonicalEventJson([2, 1])).not.toBe(canonicalEventJson([1, 2]));
  });
});
