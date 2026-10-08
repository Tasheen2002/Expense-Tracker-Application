import {
  PrismaClient,
  Prisma,
  NotificationPreference as PrismaNotificationPreference,
} from "../../../../prisma-client";
import { INotificationPreferenceRepository } from "../../domain/repositories/notification-preference.repository";
import {
  NotificationPreference,
  NotificationPreferenceProps,
  TypeSettingValue,
} from "../../domain/entities/notification-preference.entity";
import { PreferenceId } from "../../domain/value-objects/preference-id";
import { UserId, WorkspaceId } from "../../domain/value-objects";
import { NotificationConcurrencyError, NotificationPreferenceAlreadyExistsError } from '../../domain/errors/notification.errors';

const revisions = new WeakMap<NotificationPreference, number>();

export class NotificationPreferenceRepositoryImpl implements INotificationPreferenceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async mutate(userId: UserId, workspaceId: WorkspaceId,
    mutation: (preference: NotificationPreference) => void): Promise<NotificationPreference> {
    const result = await this.prisma.$transaction(async (tx) => {
      const defaults = NotificationPreference.create({ userId, workspaceId });
      await tx.notificationPreference.createMany({ data: {
        id: defaults.id.getValue(), userId: userId.getValue(), workspaceId: workspaceId.getValue(),
        emailEnabled: defaults.emailEnabled, inAppEnabled: defaults.inAppEnabled,
        pushEnabled: defaults.pushEnabled, typeSettings: {},
      }, skipDuplicates: true });
      // Lock after insert-or-ignore so concurrent first writes and existing-row updates
      // both operate on the most recently committed state under READ COMMITTED.
      await tx.$queryRaw`SELECT id FROM notification_dispatch.notification_preferences
        WHERE user_id = ${userId.getValue()}::uuid AND workspace_id = ${workspaceId.getValue()}::uuid FOR UPDATE`;
      const record = await tx.notificationPreference.findUniqueOrThrow({
        where: { userId_workspaceId: { userId: userId.getValue(), workspaceId: workspaceId.getValue() } },
      });
      const preference = this.toDomain(record);
      mutation(preference);
      const changed = preference.updatedAt.getTime() !== record.updatedAt.getTime()
        || preference.emailEnabled !== record.emailEnabled || preference.inAppEnabled !== record.inAppEnabled
        || preference.pushEnabled !== record.pushEnabled
        || JSON.stringify(preference.typeSettings) !== JSON.stringify(record.typeSettings ?? {});
      if (changed) {
        await tx.notificationPreference.update({ where: { id: record.id }, data: {
          emailEnabled: preference.emailEnabled, inAppEnabled: preference.inAppEnabled,
          pushEnabled: preference.pushEnabled, typeSettings: preference.typeSettings as Prisma.InputJsonValue,
          updatedAt: preference.updatedAt, revision: { increment: 1 },
        } });
      }
      return { preference, revision: record.revision + (changed ? 1 : 0) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    revisions.set(result.preference, result.revision);
    return result.preference;
  }

  async save(preference: NotificationPreference): Promise<void> {
    const id = preference.id.getValue();
    const typeSettings = preference.typeSettings;

    const data = {
      userId: preference.userId.getValue(),
      workspaceId: preference.workspaceId.getValue(),
      emailEnabled: preference.emailEnabled,
      inAppEnabled: preference.inAppEnabled,
      pushEnabled: preference.pushEnabled,
      updatedAt: preference.updatedAt,
      typeSettings: typeSettings
        ? (typeSettings as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    };

    const revision = revisions.get(preference);
    try {
      if (revision === undefined) {
        await this.prisma.notificationPreference.create({ data: { id, ...data, createdAt: preference.createdAt } });
        revisions.set(preference, 0);
      } else {
        const result = await this.prisma.notificationPreference.updateMany({ where: { id, revision,
          userId: data.userId, workspaceId: data.workspaceId }, data: { ...data, revision: { increment: 1 } } });
        if (result.count !== 1) throw new NotificationConcurrencyError();
        revisions.set(preference, revision + 1);
      }
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new NotificationPreferenceAlreadyExistsError();
      throw error;
    }
  }

  async findById(id: PreferenceId): Promise<NotificationPreference | null> {
    const record = await this.prisma.notificationPreference.findUnique({
      where: { id: id.getValue() },
    });

    if (!record) return null;
    return this.toDomain(record);
  }

  async findByUserAndWorkspace(
    userId: UserId,
    workspaceId: WorkspaceId,
  ): Promise<NotificationPreference | null> {
    const record = await this.prisma.notificationPreference.findUnique({
      where: {
        userId_workspaceId: {
          userId: userId.getValue(),
          workspaceId: workspaceId.getValue(),
        },
      },
    });

    if (!record) return null;
    return this.toDomain(record);
  }

  private toDomain(
    record: PrismaNotificationPreference,
  ): NotificationPreference {
    const props: NotificationPreferenceProps = {
      id: PreferenceId.fromString(record.id),
      userId: UserId.fromString(record.userId),
      workspaceId: WorkspaceId.fromString(record.workspaceId),
      emailEnabled: record.emailEnabled,
      inAppEnabled: record.inAppEnabled,
      pushEnabled: record.pushEnabled,
      typeSettings:
        (record.typeSettings as Record<string, TypeSettingValue>) || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };

    const preference = NotificationPreference.fromPersistence(props);
    revisions.set(preference, record.revision);
    return preference;
  }
}
