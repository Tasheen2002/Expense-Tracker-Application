import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import {
  NotificationType as DatabaseType, NotificationChannel as DatabaseChannel,
  NotificationPriority as DatabasePriority, NotificationStatus as DatabaseStatus,
} from '../../../prisma-client';
import { NotificationType, NotificationChannel, NotificationPriority, NotificationStatus } from '../domain/enums';
import { sendNotificationSchema, notificationResponseSchema } from '../infrastructure/http/validation/notification.schema';
import { createTemplateSchema, updateTemplateSchema, TemplateTypeSchema, TemplateChannelSchema } from '../infrastructure/http/validation/template.schema';
import { toJsonSchema } from '../infrastructure/http/validation/validator';

describe('Notification constants and enum contracts', () => {
  it.each([
    ['type', NotificationType, DatabaseType], ['channel', NotificationChannel, DatabaseChannel],
    ['priority', NotificationPriority, DatabasePriority], ['status', NotificationStatus, DatabaseStatus],
  ])('keeps domain %s values compatible with the generated database client', (_name, domain, database) => {
    expect(Object.values(domain).sort()).toEqual(Object.values(database).sort());
  });

  it('accepts every persisted template type/channel and rejects unsupported values', () => {
    for (const type of Object.values(DatabaseType)) expect(TemplateTypeSchema.safeParse(type).success).toBe(true);
    for (const channel of Object.values(DatabaseChannel)) expect(TemplateChannelSchema.safeParse(channel).success).toBe(true);
    expect(TemplateTypeSchema.safeParse('UNKNOWN').success).toBe(false);
    expect(TemplateChannelSchema.safeParse('SMS').success).toBe(false);
  });

  const template = { name: 'Template', type: NotificationType.SYSTEM_ALERT, channel: NotificationChannel.EMAIL,
    subjectTemplate: 'Subject', bodyTemplate: 'Body' };
  it.each([
    ['name', 100], ['subjectTemplate', 255], ['bodyTemplate', 50_000],
  ] as const)('enforces the %s boundary at creation', (field, maximum) => {
    expect(createTemplateSchema.safeParse({ ...template, [field]: 'x'.repeat(maximum) }).success).toBe(true);
    expect(createTemplateSchema.safeParse({ ...template, [field]: 'x'.repeat(maximum + 1) }).success).toBe(false);
    expect(createTemplateSchema.safeParse({ ...template, [field]: '' }).success).toBe(false);
  });

  it.each([['subjectTemplate', 255], ['bodyTemplate', 50_000]] as const)('applies the same %s bounds to updates', (field, maximum) => {
    expect(updateTemplateSchema.safeParse({ [field]: 'x'.repeat(maximum) }).success).toBe(true);
    expect(updateTemplateSchema.safeParse({ [field]: 'x'.repeat(maximum + 1) }).success).toBe(false);
    expect(updateTemplateSchema.safeParse({ [field]: '' }).success).toBe(false);
  });

  it.each([['title', 255], ['content', 5000]] as const)('enforces notification %s bounds', (field, maximum) => {
    const notification = { requestId: '33333333-3333-4333-8333-333333333333', data: {}, recipientId: '11111111-1111-4111-8111-111111111111', workspaceId: '22222222-2222-4222-8222-222222222222',
      type: NotificationType.SYSTEM_ALERT, title: 'Title', content: 'Content' };
    expect(sendNotificationSchema.safeParse({ ...notification, [field]: 'x'.repeat(maximum) }).success).toBe(true);
    expect(sendNotificationSchema.safeParse({ ...notification, [field]: 'x'.repeat(maximum + 1) }).success).toBe(false);
  });

  it('rejects unknown response states rather than advertising arbitrary strings', () => {
    const response = { id: '11111111-1111-4111-8111-111111111111', type: NotificationType.SYSTEM_ALERT,
      channel: NotificationChannel.IN_APP, priority: NotificationPriority.MEDIUM, title: 'Title', content: 'Content',
      status: 'UNKNOWN', isRead: false, readAt: null, sentAt: null, createdAt: new Date().toISOString() };
    expect(notificationResponseSchema.safeParse(response).success).toBe(false);
    for (const status of Object.values(DatabaseStatus)) {
      expect(notificationResponseSchema.safeParse({ ...response, status }).success).toBe(true);
    }
  });

  it('Fastify and Zod agree on template body size for creation and update', async () => {
    const app = Fastify({ logger: false });
    app.post('/templates', { schema: { body: toJsonSchema(createTemplateSchema) } }, async () => ({ ok: true }));
    app.patch('/templates', { schema: { body: toJsonSchema(updateTemplateSchema) } }, async () => ({ ok: true }));
    try {
      for (const method of ['POST', 'PATCH'] as const) {
        const valid = method === 'POST' ? { ...template, bodyTemplate: 'x'.repeat(50_000) } : { bodyTemplate: 'x'.repeat(50_000) };
        expect((await app.inject({ method, url: '/templates', payload: valid })).statusCode).toBe(200);
        expect((await app.inject({ method, url: '/templates', payload: { ...valid, bodyTemplate: 'x'.repeat(50_001) } })).statusCode).toBe(400);
      }
    } finally { await app.close(); }
  });
});

