import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '../../../prisma-client';
import { PreferenceService } from '../application/services/preference.service';
import { NotificationPreferenceRepositoryImpl } from '../infrastructure/persistence/notification-preference.repository.impl';
import { NotificationType } from '../domain/enums';
import { InvalidNotificationDataError, PreferenceNotFoundByIdError } from '../domain/errors/notification.errors';

const database = process.env.NOTIFICATION_TEST_DATABASE_URL;
describe.skipIf(!database || database !== process.env.DATABASE_URL)('Preference service — PostgreSQL', () => {
  const prisma = new PrismaClient();
  const service = new PreferenceService(new NotificationPreferenceRepositoryImpl(prisma));
  const users: string[] = [];
  function scope() { const user = randomUUID(); users.push(user); return { user, workspace: randomUUID() }; }
  afterAll(async () => {
    await prisma.notificationPreference.deleteMany({ where: { userId: { in: users } } });
    await prisma.$disconnect();
  });

  it('concurrent first requests return the same durable identity', async () => {
    const { user, workspace } = scope();
    const results = await Promise.all(Array.from({ length: 6 }, () => service.getOrCreatePreferences(user, workspace)));
    expect(new Set(results.map(result => result.id)).size).toBe(1);
    expect(await prisma.notificationPreference.count({ where: { userId: user, workspaceId: workspace } })).toBe(1);
  });

  it('concurrent first patches preserve independent global changes', async () => {
    const { user, workspace } = scope();
    await Promise.all([service.updateGlobalPreferences(user, workspace, { email: false }),
      service.updateGlobalPreferences(user, workspace, { push: true })]);
    expect(await service.getPreferences(user, workspace)).toMatchObject({ emailEnabled: false, pushEnabled: true });
  });

  it('concurrent existing-row updates preserve global and type settings', async () => {
    const { user, workspace } = scope();
    await service.getOrCreatePreferences(user, workspace);
    await Promise.all([
      service.updateGlobalPreferences(user, workspace, { email: false }),
      service.updateTypePreference(user, workspace, NotificationType.SYSTEM_ALERT, { inApp: false }),
      service.updateTypePreference(user, workspace, NotificationType.SYSTEM_ALERT, { push: true }),
      service.updateTypePreference(user, workspace, NotificationType.BUDGET_ALERT, { email: false }),
    ]);
    expect(await service.getPreferences(user, workspace)).toMatchObject({ emailEnabled: false,
      typeSettings: { SYSTEM_ALERT: { inApp: false, push: true }, BUDGET_ALERT: { email: false } } });
  });

  it('invalid first mutation rolls back default creation', async () => {
    const { user, workspace } = scope();
    // @ts-expect-error Test an untyped input at the application boundary.
    await expect(service.updateGlobalPreferences(user, workspace, { email: 'yes' })).rejects.toBeInstanceOf(InvalidNotificationDataError);
    expect(await service.getPreferences(user, workspace)).toBeNull();
    // @ts-expect-error Unsupported notification type at runtime.
    await expect(service.updateTypePreference(user, workspace, 'UNKNOWN', { email: false })).rejects.toBeInstanceOf(InvalidNotificationDataError);
    expect(await service.getPreferences(user, workspace)).toBeNull();
  });

  it('invalid mutation leaves existing preferences unchanged', async () => {
    const { user, workspace } = scope();
    const original = await service.updateGlobalPreferences(user, workspace, { email: false });
    // @ts-expect-error Test validation before any partial update commits.
    await expect(service.updateGlobalPreferences(user, workspace, { email: true, push: 'yes' })).rejects.toBeInstanceOf(InvalidNotificationDataError);
    expect(await service.getPreferences(user, workspace)).toEqual(original);
  });

  it('isolates users and workspaces and scopes by-ID reads', async () => {
    const { user, workspace } = scope(); const other = scope();
    const original = await service.updateGlobalPreferences(user, workspace, { email: false });
    await service.updateGlobalPreferences(user, other.workspace, { push: true });
    await service.updateGlobalPreferences(other.user, workspace, { inApp: false });
    expect(await service.getPreferences(user, workspace)).toEqual(original);
    expect(await service.getPreferencesById(original.id, user, workspace)).toEqual(original);
    await expect(service.getPreferencesById(original.id, other.user, workspace)).rejects.toBeInstanceOf(PreferenceNotFoundByIdError);
    await expect(service.getPreferencesById(original.id, user, other.workspace)).rejects.toBeInstanceOf(PreferenceNotFoundByIdError);
  });

  it('read defaults validate enums and never persist', async () => {
    const { user, workspace } = scope();
    for (const [channel, expected] of [['email', true], ['inApp', true], ['push', false]] as const) {
      expect(await service.isChannelEnabled(user, workspace, NotificationType.SYSTEM_ALERT, channel)).toBe(expected);
    }
    // @ts-expect-error Reject unsupported channels even when no row exists.
    await expect(service.isChannelEnabled(user, workspace, NotificationType.SYSTEM_ALERT, 'sms')).rejects.toBeInstanceOf(InvalidNotificationDataError);
    // @ts-expect-error Reject unsupported types even when no row exists.
    await expect(service.isChannelEnabled(user, workspace, 'UNKNOWN', 'email')).rejects.toBeInstanceOf(InvalidNotificationDataError);
    expect(await service.getPreferences(user, workspace)).toBeNull();
  });

  it('type preference changes are reflected in DTOs and channel checks', async () => {
    const { user, workspace } = scope();
    const result = await service.updateTypePreference(user, workspace, NotificationType.SYSTEM_ALERT, { email: false });
    expect(result.typeSettings.SYSTEM_ALERT).toEqual({ email: false });
    result.typeSettings.SYSTEM_ALERT.email = true;
    expect(await service.isChannelEnabled(user, workspace, NotificationType.SYSTEM_ALERT, 'email')).toBe(false);
  });
});
