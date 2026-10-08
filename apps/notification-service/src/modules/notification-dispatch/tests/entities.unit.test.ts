import { afterEach, describe, expect, it, vi } from 'vitest';
import { Notification, NotificationSentEvent } from '../domain/entities/notification.entity';
import { NotificationTemplate } from '../domain/entities/notification-template.entity';
import { NotificationPreference } from '../domain/entities/notification-preference.entity';
import { UserId, WorkspaceId, NotificationId, TemplateId, PreferenceId } from '../domain/value-objects';
import { NotificationType, NotificationChannel, NotificationPriority, NotificationStatus } from '../domain/enums';
import { InvalidNotificationDataError, InvalidNotificationStateError } from '../domain/errors/notification.errors';

const workspaceId = WorkspaceId.create();
const recipientId = UserId.create();
const type = Object.values(NotificationType)[0];
const notificationInput = { workspaceId, recipientId, type, channel: NotificationChannel.EMAIL,
  title: 'Title', content: 'Content' };
const templateInput = { workspaceId, type, channel: NotificationChannel.EMAIL, name: 'Template',
  subjectTemplate: 'Subject', bodyTemplate: 'Body' };
afterEach(() => { vi.useRealTimers(); });

describe('Notification invariants and lifecycle', () => {
  it.each([['title', 255], ['content', 5000]] as const)('enforces %s boundaries', (field, maximum) => {
    for (const value of ['', '  ', 'x'.repeat(maximum + 1)]) {
      expect(() => Notification.create({ ...notificationInput, [field]: value })).toThrow(InvalidNotificationDataError);
    }
    expect(Notification.create({ ...notificationInput, [field]: 'x'.repeat(maximum) })[field]).toHaveLength(maximum);
  });

  it.each(['type', 'channel', 'priority'] as const)('rejects unsupported %s values', (field) => {
    // @ts-expect-error Intentionally simulate untyped input crossing a domain boundary.
    expect(() => Notification.create({ ...notificationInput, [field]: 'UNKNOWN', priority: field === 'priority' ? 'UNKNOWN' : NotificationPriority.MEDIUM })).toThrow(InvalidNotificationDataError);
  });

  it('emits only one success event for repeated sends', () => {
    const notification = Notification.create(notificationInput);
    notification.clearDomainEvents();
    notification.markAsSent();
    const time = notification.sentAt!.getTime();
    notification.markAsSent();
    expect(notification.domainEvents.map(event => event.eventType)).toEqual(['notification.sent']);
    expect(notification.sentAt!.getTime()).toBe(time);
  });

  it('allows a failed attempt to recover and clears its error', () => {
    const notification = Notification.create(notificationInput);
    notification.clearDomainEvents();
    notification.markAsFailed('temporary');
    notification.markAsFailed('temporary');
    expect(notification.domainEvents).toHaveLength(1);
    notification.markAsSent();
    expect(notification.status).toBe(NotificationStatus.SENT);
    expect(notification.error).toBeUndefined();
    expect(notification.domainEvents.map(event => event.eventType)).toEqual(['notification.failed', 'notification.sent']);
  });

  it('keeps successful delivery from being overwritten by failure', () => {
    const notification = Notification.create(notificationInput);
    notification.markAsSent();
    expect(() => notification.markAsFailed('late failure')).toThrow(InvalidNotificationStateError);
    expect(notification.status).toBe(NotificationStatus.SENT);
  });

  it('preserves read state and emits one read event', () => {
    const notification = Notification.create(notificationInput);
    notification.markAsSent();
    notification.clearDomainEvents();
    notification.markAsRead();
    notification.markAsRead();
    expect(() => notification.markAsSent()).toThrow(InvalidNotificationStateError);
    expect(() => notification.markAsFailed('late')).toThrow(InvalidNotificationStateError);
    expect(notification.status).toBe(NotificationStatus.READ);
    expect(notification.domainEvents.map(event => event.eventType)).toEqual(['notification.read']);
  });

  it('allows pending in-app notifications to be read', () => {
    const notification = Notification.create({ ...notificationInput, channel: NotificationChannel.IN_APP });
    notification.markAsRead();
    expect(notification.isRead()).toBe(true);
  });

  it('isolates nested data at input, getter and DTO boundaries', () => {
    const data = { nested: { value: 'original' } };
    const notification = Notification.create({ ...notificationInput, data });
    data.nested.value = 'input mutation';
    (notification.data!.nested as { value: string }).value = 'getter mutation';
    (Notification.toDTO(notification).data!.nested as { value: string }).value = 'DTO mutation';
    expect(notification.data).toEqual({ nested: { value: 'original' } });
  });

  it('isolates timestamp getters and pending event arrays', () => {
    const notification = Notification.create(notificationInput);
    const created = notification.createdAt.getTime();
    notification.createdAt.setTime(0);
    notification.markAsSent();
    const sent = notification.sentAt!.getTime();
    notification.sentAt!.setTime(0);
    notification.markAsRead();
    const read = notification.readAt!.getTime();
    notification.readAt!.setTime(0);
    notification.domainEvents.length = 0;
    expect(notification.createdAt.getTime()).toBe(created);
    expect(notification.sentAt!.getTime()).toBe(sent);
    expect(notification.readAt!.getTime()).toBe(read);
    expect(notification.domainEvents).toHaveLength(3);
  });

  it('snapshots the event date independently of caller mutations', () => {
    const date = new Date('2026-09-30T10:00:00Z');
    const event = new NotificationSentEvent('n', 'w', 'u', NotificationChannel.EMAIL, date);
    date.setTime(0);
    event.sentAt.setTime(0);
    expect(event.getPayload().sentAt).toBe('2026-09-30T10:00:00.000Z');
  });

  it('copies persisted state without emitting creation events', () => {
    const props = { ...notificationInput, id: NotificationId.create(), priority: NotificationPriority.MEDIUM,
      status: NotificationStatus.PENDING, data: { nested: { value: 1 } }, createdAt: new Date(), updatedAt: new Date() };
    const notification = Notification.fromPersistence(props);
    props.title = 'external'; props.createdAt.setTime(0); props.data.nested.value = 2;
    expect(notification.title).toBe('Title');
    expect(notification.createdAt.getTime()).not.toBe(0);
    expect(notification.data).toEqual({ nested: { value: 1 } });
    expect(notification.domainEvents).toHaveLength(0);
  });
});

describe('NotificationTemplate invariants', () => {
  it.each([['name', 100], ['subjectTemplate', 255], ['bodyTemplate', 50000]] as const)('enforces %s boundaries', (field, maximum) => {
    for (const value of ['', '  ', 'x'.repeat(maximum + 1)]) {
      expect(() => NotificationTemplate.create({ ...templateInput, [field]: value })).toThrow(InvalidNotificationDataError);
    }
    expect(NotificationTemplate.create({ ...templateInput, [field]: 'x'.repeat(maximum) })[field]).toHaveLength(maximum);
  });

  it('validates the entire update before changing either field', () => {
    const template = NotificationTemplate.create(templateInput);
    expect(() => template.updateTemplates('New subject', '')).toThrow(InvalidNotificationDataError);
    expect(template.subjectTemplate).toBe('Subject');
    expect(template.bodyTemplate).toBe('Body');
  });

  it('keeps no-op updates and repeated activation/deactivation from advancing timestamps', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-30T10:00:00Z'));
    const template = NotificationTemplate.create(templateInput);
    const initial = template.updatedAt.getTime();
    vi.advanceTimersByTime(1000);
    template.updateTemplates('Subject', 'Body'); template.activate();
    expect(template.updatedAt.getTime()).toBe(initial);
    template.deactivate(); const changed = template.updatedAt.getTime();
    vi.advanceTimersByTime(1000); template.deactivate();
    expect(template.updatedAt.getTime()).toBe(changed);
    template.activate(); expect(template.isActive).toBe(true);
  });

  it('copies persistence input and exposed dates', () => {
    const props = { ...templateInput, id: TemplateId.create(), isActive: true, createdAt: new Date(), updatedAt: new Date() };
    const template = NotificationTemplate.fromPersistence(props);
    props.name = 'external'; props.createdAt.setTime(0); template.updatedAt.setTime(0);
    expect(template.name).toBe('Template');
    expect(template.createdAt.getTime()).not.toBe(0);
    expect(template.updatedAt.getTime()).not.toBe(0);
  });
});

describe('NotificationPreference invariants', () => {
  const create = () => NotificationPreference.create({ userId: recipientId, workspaceId });
  it('global opt-out overrides type-level opt-in', () => {
    const preference = create();
    preference.updateTypeSetting(type, { email: true });
    preference.updateGlobalSettings({ email: false });
    expect(preference.isChannelEnabledForType(type, 'email')).toBe(false);
  });
  it('partial settings preserve existing overrides, including explicit undefined', () => {
    const preference = create();
    preference.updateTypeSetting(type, { email: false });
    preference.updateTypeSetting(type, { email: undefined, inApp: false });
    expect(preference.typeSettings[type]).toEqual({ email: false, inApp: false });
  });
  it('rejects invalid settings before mutation', () => {
    const preference = create();
    // @ts-expect-error Runtime boundary regression.
    expect(() => preference.updateGlobalSettings({ email: false, push: 'yes' })).toThrow(InvalidNotificationDataError);
    expect(preference.emailEnabled).toBe(true);
    // @ts-expect-error Runtime boundary regression.
    expect(() => preference.updateTypeSetting('UNKNOWN', { email: false })).toThrow(InvalidNotificationDataError);
    // @ts-expect-error Runtime boundary regression.
    expect(() => preference.updateTypeSetting(type, { sms: true })).toThrow(InvalidNotificationDataError);
    expect(preference.typeSettings).toEqual({});
  });
  it('isolates settings getters from nested mutation', () => {
    const preference = create();
    preference.updateTypeSetting(type, { email: false });
    preference.typeSettings[type].email = true;
    expect(preference.isChannelEnabledForType(type, 'email')).toBe(false);
  });
  it('preserves timestamps on empty and unchanged settings', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-30T10:00:00Z'));
    const preference = create(); const initial = preference.updatedAt.getTime();
    vi.advanceTimersByTime(1000);
    preference.updateGlobalSettings({}); preference.updateGlobalSettings({ email: true });
    preference.updateTypeSetting(type, {});
    expect(preference.updatedAt.getTime()).toBe(initial);
    expect(preference.typeSettings).toEqual({});
  });
  it('copies reconstituted settings and dates', () => {
    const props = { id: PreferenceId.create(), userId: recipientId, workspaceId, emailEnabled: true,
      inAppEnabled: true, pushEnabled: false, typeSettings: { [type]: { email: false } },
      createdAt: new Date(), updatedAt: new Date() };
    const preference = NotificationPreference.fromPersistence(props);
    props.typeSettings[type].email = true; props.createdAt.setTime(0); preference.updatedAt.setTime(0);
    expect(preference.isChannelEnabledForType(type, 'email')).toBe(false);
    expect(preference.createdAt.getTime()).not.toBe(0);
    expect(preference.updatedAt.getTime()).not.toBe(0);
  });
});
