import { INotificationTemplateRepository } from '../../domain/repositories/notification-template.repository';
import { NotificationTemplate, NotificationTemplateDTO } from '../../domain/entities/notification-template.entity';
import { NotificationType } from '../../domain/enums/notification-type.enum';
import { NotificationChannel } from '../../domain/enums/notification-channel.enum';
import { TemplateId } from '../../domain/value-objects/template-id';
import { TemplateNotFoundByIdError } from '../../domain/errors/notification.errors';
import { validateEnum, validateText } from '../../domain/entities/entity-validation';
import { TEMPLATE_NAME_MAX_LENGTH, TEMPLATE_SUBJECT_MAX_LENGTH, TEMPLATE_BODY_MAX_LENGTH } from '../../domain/constants';
import { TemplateAccess, requireTemplateAccess } from './template-access';
import sanitizeHtml from 'sanitize-html';

export interface CreateTemplateParams {
  workspaceId?: string;
  name: string;
  type: NotificationType;
  channel: NotificationChannel;
  subjectTemplate: string;
  bodyTemplate: string;
}
export interface UpdateTemplateParams { subjectTemplate?: string; bodyTemplate?: string; }

export class TemplateService {
  constructor(private readonly templateRepository: INotificationTemplateRepository) {}

  private sanitizeSubject(value: string): string {
    return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
  }
  private sanitizeBody(value: string): string {
    return sanitizeHtml(value, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
      allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src', 'alt', 'width', 'height'] },
    });
  }

  async createTemplate(params: CreateTemplateParams, access: TemplateAccess): Promise<NotificationTemplateDTO> {
    const workspaceId = requireTemplateAccess(access, params.workspaceId);
    validateText('name', params.name, TEMPLATE_NAME_MAX_LENGTH);
    validateText('subjectTemplate', params.subjectTemplate, TEMPLATE_SUBJECT_MAX_LENGTH);
    validateText('bodyTemplate', params.bodyTemplate, TEMPLATE_BODY_MAX_LENGTH);
    const template = NotificationTemplate.create({ ...params, workspaceId,
      subjectTemplate: this.sanitizeSubject(params.subjectTemplate), bodyTemplate: this.sanitizeBody(params.bodyTemplate) });
    await this.templateRepository.save(template);
    return NotificationTemplate.toDTO(template);
  }

  async getTemplateById(id: string, access: TemplateAccess): Promise<NotificationTemplateDTO> {
    const workspaceId = requireTemplateAccess(access, access?.workspaceId);
    const template = await this.templateRepository.findById(TemplateId.fromString(id));
    if (!template || !template.workspaceId?.equals(workspaceId)) throw new TemplateNotFoundByIdError(id);
    return NotificationTemplate.toDTO(template);
  }

  async getActiveTemplate(workspace: string | undefined, type: NotificationType, channel: NotificationChannel,
    access: TemplateAccess): Promise<NotificationTemplateDTO | null> {
    const workspaceId = requireTemplateAccess(access, workspace);
    validateEnum('type', type, Object.values(NotificationType));
    validateEnum('channel', channel, Object.values(NotificationChannel));
    // Global fallback is readable through an authorized workspace, but cannot be edited through it.
    const template = await this.templateRepository.findActiveTemplate(workspaceId, type, channel);
    return template ? NotificationTemplate.toDTO(template) : null;
  }

  async updateTemplate(id: string, params: UpdateTemplateParams, access: TemplateAccess): Promise<NotificationTemplateDTO> {
    const workspaceId = requireTemplateAccess(access, access?.workspaceId);
    if (params.subjectTemplate !== undefined) validateText('subjectTemplate', params.subjectTemplate, TEMPLATE_SUBJECT_MAX_LENGTH);
    if (params.bodyTemplate !== undefined) validateText('bodyTemplate', params.bodyTemplate, TEMPLATE_BODY_MAX_LENGTH);
    const subject = params.subjectTemplate === undefined ? undefined : this.sanitizeSubject(params.subjectTemplate);
    const body = params.bodyTemplate === undefined ? undefined : this.sanitizeBody(params.bodyTemplate);
    const template = await this.templateRepository.mutate(TemplateId.fromString(id), workspaceId, entity => {
      entity.updateTemplates(subject ?? entity.subjectTemplate, body ?? entity.bodyTemplate);
    });
    return NotificationTemplate.toDTO(template);
  }

  async activateTemplate(id: string, access: TemplateAccess): Promise<NotificationTemplateDTO> {
    return this.setActive(id, true, access);
  }
  async deactivateTemplate(id: string, access: TemplateAccess): Promise<NotificationTemplateDTO> {
    return this.setActive(id, false, access);
  }
  private async setActive(id: string, active: boolean, access: TemplateAccess): Promise<NotificationTemplateDTO> {
    const workspaceId = requireTemplateAccess(access, access?.workspaceId);
    const template = await this.templateRepository.mutate(TemplateId.fromString(id), workspaceId, entity => {
      if (active) entity.activate(); else entity.deactivate();
    });
    return NotificationTemplate.toDTO(template);
  }
}
