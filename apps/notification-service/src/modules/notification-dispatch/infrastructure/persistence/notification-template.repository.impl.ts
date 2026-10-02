import {
  PrismaClient,
  Prisma,
  NotificationType as PrismaNotificationType,
  NotificationChannel as PrismaNotificationChannel,
  NotificationTemplate as PrismaNotificationTemplate,
} from "../../../../prisma-client";
import { INotificationTemplateRepository } from "../../domain/repositories/notification-template.repository";
import {
  NotificationTemplate,
  NotificationTemplateProps,
} from "../../domain/entities/notification-template.entity";
import { TemplateId } from "../../domain/value-objects/template-id";
import { WorkspaceId } from "../../domain/value-objects";
import { NotificationType } from "../../domain/enums/notification-type.enum";
import { NotificationChannel } from "../../domain/enums/notification-channel.enum";
import { TemplateAlreadyExistsError, TemplateNotFoundByIdError, NotificationConcurrencyError } from '../../domain/errors/notification.errors';

const revisions = new WeakMap<NotificationTemplate, number>();

export class NotificationTemplateRepositoryImpl implements INotificationTemplateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async mutate(id: TemplateId, workspaceId: WorkspaceId,
    mutation: (template: NotificationTemplate) => void): Promise<NotificationTemplate> {
    const result = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM notification_dispatch.notification_templates
        WHERE id = ${id.getValue()}::uuid AND workspace_id = ${workspaceId.getValue()}::uuid FOR UPDATE`;
      const record = await tx.notificationTemplate.findFirst({ where: { id: id.getValue(), workspaceId: workspaceId.getValue() } });
      if (!record) throw new TemplateNotFoundByIdError(id.getValue());
      const template = this.toDomain(record);
      mutation(template);
      if (template.subjectTemplate !== record.subjectTemplate || template.bodyTemplate !== record.bodyTemplate
        || template.isActive !== record.isActive) {
        await tx.notificationTemplate.update({ where: { id: record.id }, data: {
          subjectTemplate: template.subjectTemplate, bodyTemplate: template.bodyTemplate,
          isActive: template.isActive, updatedAt: template.updatedAt, revision: { increment: 1 },
        } });
      }
      return { template, revision: record.revision + (template.subjectTemplate !== record.subjectTemplate
        || template.bodyTemplate !== record.bodyTemplate || template.isActive !== record.isActive ? 1 : 0) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    revisions.set(result.template, result.revision);
    return result.template;
  }

  async save(template: NotificationTemplate): Promise<void> {
    const id = template.id.getValue();

    const data = {
      workspaceId: template.workspaceId?.getValue() || null,
      name: template.name,
      type: template.type as unknown as PrismaNotificationType,
      channel: template.channel as unknown as PrismaNotificationChannel,
      subjectTemplate: template.subjectTemplate,
      bodyTemplate: template.bodyTemplate,
      isActive: template.isActive,
      updatedAt: template.updatedAt,
    };

    try {
      const revision = revisions.get(template);
      if (revision === undefined) {
        await this.prisma.notificationTemplate.create({ data: { id, ...data, createdAt: template.createdAt } });
        revisions.set(template, 0);
      } else {
        const result = await this.prisma.notificationTemplate.updateMany({ where: { id, revision,
          workspaceId: data.workspaceId }, data: { ...data, revision: { increment: 1 } } });
        if (result.count !== 1) throw new NotificationConcurrencyError();
        revisions.set(template, revision + 1);
      }
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new TemplateAlreadyExistsError();
      throw error;
    }
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

    // One statement gives tenant precedence and global fallback on one snapshot.
    const template = await this.prisma.notificationTemplate.findFirst({
      where: {
        ...(workspaceId ? { OR: [{ workspaceId: workspaceId.getValue() }, { workspaceId: null }] } : { workspaceId: null }),
        type: prismaType,
        channel: prismaChannel,
        isActive: true,
      },
      orderBy: { workspaceId: { sort: 'asc', nulls: 'last' } },
    });
    return template ? this.toDomain(template) : null;
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

    const template = NotificationTemplate.fromPersistence(props);
    revisions.set(template, record.revision);
    return template;
  }
}
