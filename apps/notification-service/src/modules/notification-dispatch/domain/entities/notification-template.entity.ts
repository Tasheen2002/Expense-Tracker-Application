import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { TemplateId } from '../value-objects/template-id';
import { WorkspaceId } from '../value-objects';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { TEMPLATE_NAME_MAX_LENGTH, TEMPLATE_SUBJECT_MAX_LENGTH, TEMPLATE_BODY_MAX_LENGTH } from '../constants';
import { validateText, validateEnum, copyDate } from './entity-validation';

export interface NotificationTemplateProps {
  id: TemplateId;
  workspaceId?: WorkspaceId;
  name: string;
  type: NotificationType;
  channel: NotificationChannel;
  subjectTemplate: string;
  bodyTemplate: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class NotificationTemplate extends AggregateRoot {
  private constructor(private props: NotificationTemplateProps) {
    super();
    this.props = { ...props, createdAt: copyDate(props.createdAt), updatedAt: copyDate(props.updatedAt) };
  }

  static create(params: {
    workspaceId?: WorkspaceId;
    name: string;
    type: NotificationType;
    channel: NotificationChannel;
    subjectTemplate: string;
    bodyTemplate: string;
  }): NotificationTemplate {
    validateText('name', params.name, TEMPLATE_NAME_MAX_LENGTH);
    validateText('subjectTemplate', params.subjectTemplate, TEMPLATE_SUBJECT_MAX_LENGTH);
    validateText('bodyTemplate', params.bodyTemplate, TEMPLATE_BODY_MAX_LENGTH);
    validateEnum('type', params.type, Object.values(NotificationType));
    validateEnum('channel', params.channel, Object.values(NotificationChannel));
    return new NotificationTemplate({
      id: TemplateId.create(),
      workspaceId: params.workspaceId,
      name: params.name,
      type: params.type,
      channel: params.channel,
      subjectTemplate: params.subjectTemplate,
      bodyTemplate: params.bodyTemplate,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(props: NotificationTemplateProps): NotificationTemplate {
    return new NotificationTemplate(props);
  }

  get id(): TemplateId { return this.props.id; }
  get workspaceId(): WorkspaceId | undefined { return this.props.workspaceId; }
  get name(): string { return this.props.name; }
  get type(): NotificationType { return this.props.type; }
  get channel(): NotificationChannel { return this.props.channel; }
  get subjectTemplate(): string { return this.props.subjectTemplate; }
  get bodyTemplate(): string { return this.props.bodyTemplate; }
  get isActive(): boolean { return this.props.isActive; }
  get createdAt(): Date { return copyDate(this.props.createdAt); }
  get updatedAt(): Date { return copyDate(this.props.updatedAt); }

  updateTemplates(subject: string, body: string): void {
    validateText('subjectTemplate', subject, TEMPLATE_SUBJECT_MAX_LENGTH);
    validateText('bodyTemplate', body, TEMPLATE_BODY_MAX_LENGTH);
    if (subject === this.props.subjectTemplate && body === this.props.bodyTemplate) return;
    this.props.subjectTemplate = subject;
    this.props.bodyTemplate = body;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    if (this.props.isActive) return;
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    if (!this.props.isActive) return;
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  static toDTO(template: NotificationTemplate): NotificationTemplateDTO {
    return {
      id: template.id.getValue(),
      workspaceId: template.workspaceId?.getValue() || null,
      name: template.name,
      type: template.type,
      channel: template.channel,
      subjectTemplate: template.subjectTemplate,
      bodyTemplate: template.bodyTemplate,
      isActive: template.isActive,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }
}

export interface NotificationTemplateDTO {
  id: string;
  workspaceId: string | null;
  name: string;
  type: string;
  channel: string;
  subjectTemplate: string;
  bodyTemplate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
