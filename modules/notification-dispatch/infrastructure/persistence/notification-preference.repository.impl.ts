import {
  PrismaClient,
  Prisma,
  NotificationPreference as PrismaNotificationPreference,
} from "@prisma/client";
import { INotificationPreferenceRepository } from "../../domain/repositories/notification-preference.repository";
import {
  NotificationPreference,
  NotificationPreferenceProps,
  TypeSettingValue,
} from "../../domain/entities/notification-preference.entity";
import { PreferenceId } from "../../domain/value-objects/preference-id";
import { UserId, WorkspaceId } from "../../domain/value-objects";

export class NotificationPreferenceRepositoryImpl implements INotificationPreferenceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(preference: NotificationPreference): Promise<void> {
    const id = preference.getId().getValue();
    const typeSettings = preference["props"].typeSettings;

    const data = {
      userId: preference.getUserId().getValue(),
      workspaceId: preference.getWorkspaceId().getValue(),
      emailEnabled: preference.isEmailEnabled(),
      inAppEnabled: preference.isInAppEnabled(),
      pushEnabled: preference.isPushEnabled(),
      typeSettings: typeSettings
        ? (typeSettings as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    };

    await this.prisma.notificationPreference.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
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

    return NotificationPreference.reconstitute(props);
  }
}
