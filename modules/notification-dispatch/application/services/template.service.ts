import { INotificationTemplateRepository } from "../../domain/repositories/notification-template.repository";
import { NotificationTemplate } from "../../domain/entities/notification-template.entity";
import { NotificationType } from "../../domain/enums/notification-type.enum";
import { NotificationChannel } from "../../domain/enums/notification-channel.enum";
import { TemplateId } from "../../domain/value-objects/template-id";
import { WorkspaceId } from "../../domain/value-objects";
import { TemplateNotFoundByIdError } from "../../domain/errors/notification.errors";
import sanitizeHtml from "sanitize-html";

export interface CreateTemplateParams {
  workspaceId?: string;
  name: string;
  type: NotificationType;
  channel: NotificationChannel;
  subjectTemplate: string;
  bodyTemplate: string;
}

export interface UpdateTemplateParams {
  subjectTemplate?: string;
  bodyTemplate?: string;
}

export class TemplateService {
  constructor(
    private readonly templateRepository: INotificationTemplateRepository,
  ) {}

  async createTemplate(
    params: CreateTemplateParams,
  ): Promise<NotificationTemplate> {
    const workspaceId = params.workspaceId
      ? WorkspaceId.fromString(params.workspaceId)
      : undefined;

    // SECURITY: Sanitize HTML content to prevent XSS
    const sanitizedSubject = sanitizeHtml(params.subjectTemplate, {
      allowedTags: [], // Subject should not have HTML tags
      allowedAttributes: {},
    });

    const sanitizedBody = sanitizeHtml(params.bodyTemplate, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ["src", "alt", "width", "height"],
      },
    });

    const template = NotificationTemplate.create({
      workspaceId,
      name: params.name,
      type: params.type,
      channel: params.channel,
      subjectTemplate: sanitizedSubject,
      bodyTemplate: sanitizedBody,
    });

    await this.templateRepository.save(template);
    return template;
  }

  async getTemplateById(id: string): Promise<NotificationTemplate> {
    const templateId = TemplateId.fromString(id);
    const template = await this.templateRepository.findById(templateId);

    if (!template) {
      throw new TemplateNotFoundByIdError(id);
    }

    return template;
  }

  async getActiveTemplate(
    workspaceId: string | undefined,
    type: NotificationType,
    channel: NotificationChannel,
  ): Promise<NotificationTemplate | null> {
    const wsId = workspaceId ? WorkspaceId.fromString(workspaceId) : undefined;
    return this.templateRepository.findActiveTemplate(wsId, type, channel);
  }

  async updateTemplate(
    id: string,
    params: UpdateTemplateParams,
  ): Promise<NotificationTemplate> {
    const template = await this.getTemplateById(id);

    // SECURITY: Sanitize HTML content to prevent XSS
    if (params.subjectTemplate !== undefined) {
      const sanitizedSubject = sanitizeHtml(params.subjectTemplate, {
        allowedTags: [], // Subject should not have HTML tags
        allowedAttributes: {},
      });
      template.updateTemplates(sanitizedSubject, template.getBodyTemplate());
    }

    if (params.bodyTemplate !== undefined) {
      const sanitizedBody = sanitizeHtml(params.bodyTemplate, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          img: ["src", "alt", "width", "height"],
        },
      });
      template.updateTemplates(template.getSubjectTemplate(), sanitizedBody);
    }

    await this.templateRepository.save(template);
    return template;
  }

  async activateTemplate(id: string): Promise<NotificationTemplate> {
    const template = await this.getTemplateById(id);
    template.activate();
    await this.templateRepository.save(template);
    return template;
  }

  async deactivateTemplate(id: string): Promise<NotificationTemplate> {
    const template = await this.getTemplateById(id);
    template.deactivate();
    await this.templateRepository.save(template);
    return template;
  }
}
