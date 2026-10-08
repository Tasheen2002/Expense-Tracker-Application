import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { InvalidUuidError } from '@core/domain/value-objects/uuid-id.base';
import { NotificationId, PreferenceId, TemplateId } from '../domain/value-objects';
import { markAsReadParamsSchema } from '../infrastructure/http/validation/notification.schema';
import { templateParamsSchema } from '../infrastructure/http/validation/template.schema';
import { registerNotificationOutboxEventRoutes } from '../infrastructure/http/routes/outbox-event.routes';
import type { PrismaClient } from '../../../prisma-client';
import { registerTemplateRoutes } from '../infrastructure/http/routes/template.routes';
import { registerNotificationRoutes } from '../infrastructure/http/routes/notification.routes';
import type { TemplateController } from '../infrastructure/http/controllers/template.controller';
import type { NotificationController } from '../infrastructure/http/controllers/notification.controller';

const id = '123e4567-e89b-42d3-a456-426614174000';
const wrappers = [NotificationId, PreferenceId, TemplateId];

it('keeps distinct ID types separate at compile time as well as runtime', () => {
  // @ts-expect-error Preference IDs cannot be assigned to notification IDs.
  const notification: NotificationId = PreferenceId.create();
  // @ts-expect-error Template IDs cannot be assigned to preference IDs.
  const preference: PreferenceId = TemplateId.create();
  // @ts-expect-error Notification IDs cannot be assigned to template IDs.
  const template: TemplateId = NotificationId.create();
  expect(notification.getTypeName()).toBe('PreferenceId');
  expect(preference.getTypeName()).toBe('TemplateId');
  expect(template.getTypeName()).toBe('NotificationId');
});

describe.each(wrappers)('%s ID contract', (Wrapper) => {
  it('generates distinct UUIDv4 identifiers', () => {
    const first = Wrapper.create(); const second = Wrapper.create();
    expect(first.getValue()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(first.equals(second)).toBe(false);
  });
  it('normalizes case and round-trips through JSON', () => {
    const value = Wrapper.fromString(id.toUpperCase());
    expect(value.getValue()).toBe(id);
    expect(value.toString()).toBe(id);
    expect(Wrapper.fromString(JSON.parse(JSON.stringify(value))).equals(value)).toBe(true);
    expect(value.equals(Wrapper.fromString(id))).toBe(true);
    expect(value.equals(null)).toBe(false); expect(value.equals(undefined)).toBe(false);
  });
  it('does not equate different ID types with the same UUID', () => {
    const value = Wrapper.fromString(id);
    for (const Other of wrappers) expect(value.equals(Other.fromString(id))).toBe(Other === Wrapper);
  });
  it('cannot have its value or type identity mutated at runtime', () => {
    const value = Wrapper.fromString(id);
    expect(Reflect.set(value, 'value', '123e4567-e89b-42d3-a456-426614174099')).toBe(false);
    expect(Reflect.set(value, 'typeName', 'OtherId')).toBe(false);
    expect(value.getValue()).toBe(id);
    expect(value.equals(Wrapper.fromString(id))).toBe(true);
  });
  it('rejects invalid and unsupported UUIDs with the shared typed error', () => {
    const invalid: unknown[] = ['', 'invalid', ` ${id}`, `${id} `, '00000000-0000-0000-0000-000000000000',
      '123e4567-e89b-72d3-a456-426614174000', '123e4567-e89b-42d3-7456-426614174000', null, undefined, 42, {}, []];
    for (const input of invalid) {
      expect(Wrapper.isValid(input as string)).toBe(false);
      try {
        Wrapper.fromString(input as string);
        throw new Error('Invalid ID was accepted');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidUuidError);
        expect(error).toMatchObject({ code: 'INVALID_UUID_FORMAT', statusCode: 400 });
      }
    }
  });
  it('preserves supported legacy UUID versions 1 through 5', () => {
    for (const version of ['1', '2', '3', '4', '5']) {
      const legacy = `123e4567-e89b-${version}2d3-a456-426614174000`;
      expect(Wrapper.fromString(legacy).getValue()).toBe(legacy);
    }
  });
});

it('HTTP ID params and domain objects agree on unsupported formats', () => {
  const unsupported = '123e4567-e89b-72d3-a456-426614174000';
  expect(markAsReadParamsSchema.safeParse({ workspaceId: id, notificationId: unsupported }).success).toBe(false);
  expect(templateParamsSchema.safeParse({ templateId: unsupported }).success).toBe(false);
});

it('rejects unsupported webhook IDs before any persistence access', async () => {
  const findUnique = vi.fn();
  const app = Fastify({ logger: false });
  await registerNotificationOutboxEventRoutes(app, { notification: { findUnique } } as unknown as PrismaClient);
  const unsupported = '123e4567-e89b-72d3-a456-426614174000';
  const event = { eventId: id, eventType: 'SyncSessionFailed', payload: { userId: id, workspaceId: id } };
  try {
    for (const input of [
      { ...event, eventId: unsupported },
      { ...event, payload: { ...event.payload, userId: unsupported } },
      { ...event, payload: { ...event.payload, workspaceId: unsupported } },
      { ...event, payload: { ...event.payload, userId: '00000000-0000-0000-0000-000000000000' } },
    ]) {
      expect((await app.inject({ method: 'POST', url: '/event-outbox/events', payload: input })).statusCode).toBe(400);
    }
    expect(findUnique).not.toHaveBeenCalled();
  } finally { await app.close(); }
});

it('actual routes reject unsupported IDs before authorization lookups or controllers', async () => {
  const app = Fastify({ logger: false });
  const handler = vi.fn();
  app.decorate('authenticate', async () => {});
  await registerTemplateRoutes(app, { getTemplateById: handler, updateTemplate: handler,
    activateTemplate: handler, deactivateTemplate: handler } as unknown as TemplateController);
  await registerNotificationRoutes(app, { markAsRead: handler } as unknown as NotificationController);
  const unsupported = '123e4567-e89b-72d3-a456-426614174000';
  try {
    for (const [method, url, payload] of [
      ['GET', `/admin/notification-templates/${unsupported}`, undefined],
      ['PATCH', `/admin/notification-templates/${unsupported}`, { subjectTemplate: 'Subject' }],
      ['PATCH', `/admin/notification-templates/${unsupported}/activate`, undefined],
      ['PATCH', `/admin/notification-templates/${unsupported}/deactivate`, undefined],
      ['PATCH', `/workspaces/${id}/notifications/${unsupported}/read`, undefined],
    ] as const) expect((await app.inject({ method, url, payload })).statusCode).toBe(400);
    expect(handler).not.toHaveBeenCalled();
  } finally { await app.close(); }
});
