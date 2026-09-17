import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { TemplateId } from '../value-objects/template-id';
import { WorkspaceId } from '../value-objects';
import { AggregateRoot } from '@core/domain/aggregate-root';

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
  }

  static create(params: {
    workspaceId?: WorkspaceId;
    name: string;
    type: NotificationType;
    channel: NotificationChannel;
    subjectTemplate: string;
    bodyTemplate: string;
  }): NotificationTemplate {
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
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  updateTemplates(subject: string, body: string): void {
    this.props.subjectTemplate = subject;
    this.props.bodyTemplate = body;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
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
