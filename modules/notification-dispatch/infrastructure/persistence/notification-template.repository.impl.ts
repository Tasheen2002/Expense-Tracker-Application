import {
  PrismaClient,
  NotificationType as PrismaNotificationType,
  NotificationChannel as PrismaNotificationChannel,
  NotificationTemplate as PrismaNotificationTemplate,
} from "@prisma/client";
import { INotificationTemplateRepository } from "../../domain/repositories/notification-template.repository";
import {
  NotificationTemplate,
  NotificationTemplateProps,
} from "../../domain/entities/notification-template.entity";
import { TemplateId } from "../../domain/value-objects/template-id";
import { WorkspaceId } from "../../domain/value-objects";
import { NotificationType } from "../../domain/enums/notification-type.enum";
import { NotificationChannel } from "../../domain/enums/notification-channel.enum";

export class NotificationTemplateRepositoryImpl implements INotificationTemplateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(template: NotificationTemplate): Promise<void> {
    const id = template.getId().getValue();
    const workspaceId = template.getWorkspaceId();

    const data = {
      workspaceId: workspaceId?.getValue() || null,
      name: template.getName(),
      type: template.getType() as unknown as PrismaNotificationType,
      channel: template.getChannel() as unknown as PrismaNotificationChannel,
      subjectTemplate: template.getSubjectTemplate(),
      bodyTemplate: template.getBodyTemplate(),
      isActive: template.isActiveTemplate(),
    };

    await this.prisma.notificationTemplate.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }

  async findById(id: TemplateId): Promise<NotificationTemplate | null> {
    const record = await this.prisma.notificationTemplate.findUnique({
      where: { id: id.getValue() },
    });

    if (!record) return null;
    return this.toDomain(record);
  }

  async findActiveTemplate(
    workspaceId: WorkspaceId | undefined,
    type: NotificationType,
    channel: NotificationChannel,
  ): Promise<NotificationTemplate | null> {
    const prismaType = type as unknown as PrismaNotificationType;
    const prismaChannel = channel as unknown as PrismaNotificationChannel;

    // First try workspace-specific template
    if (workspaceId) {
      const workspaceTemplate =
        await this.prisma.notificationTemplate.findFirst({
          where: {
            workspaceId: workspaceId.getValue(),
            type: prismaType,
            channel: prismaChannel,
            isActive: true,
          },
        });

      if (workspaceTemplate) {
        return this.toDomain(workspaceTemplate);
      }
    }

    // Fall back to global template
    const globalTemplate = await this.prisma.notificationTemplate.findFirst({
      where: {
        workspaceId: null,
        type: prismaType,
        channel: prismaChannel,
        isActive: true,
      },
    });

    if (!globalTemplate) return null;
    return this.toDomain(globalTemplate);
  }

  private toDomain(record: PrismaNotificationTemplate): NotificationTemplate {
    const props: NotificationTemplateProps = {
      id: TemplateId.fromString(record.id),
      workspaceId: record.workspaceId
        ? WorkspaceId.fromString(record.workspaceId)
        : undefined,
      name: record.name,
      type: record.type as unknown as NotificationType,
      channel: record.channel as unknown as NotificationChannel,
      subjectTemplate: record.subjectTemplate,
      bodyTemplate: record.bodyTemplate,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };

    return NotificationTemplate.reconstitute(props);
  }
}
