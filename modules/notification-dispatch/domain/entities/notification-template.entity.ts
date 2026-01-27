import { NotificationType } from "../enums/notification-type.enum";
import { NotificationChannel } from "../enums/notification-channel.enum";
import { TemplateId } from "../value-objects/template-id";
import { WorkspaceId } from "../value-objects";

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

export class NotificationTemplate {
  private props: NotificationTemplateProps;

  private constructor(props: NotificationTemplateProps) {
    this.props = props;
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

  static reconstitute(props: NotificationTemplateProps): NotificationTemplate {
    return new NotificationTemplate(props);
  }

  getId(): TemplateId {
    return this.props.id;
  }

  getWorkspaceId(): WorkspaceId | undefined {
    return this.props.workspaceId;
  }

  getName(): string {
    return this.props.name;
  }

  getType(): NotificationType {
    return this.props.type;
  }

  getChannel(): NotificationChannel {
    return this.props.channel;
  }

  getSubjectTemplate(): string {
    return this.props.subjectTemplate;
  }

  getBodyTemplate(): string {
    return this.props.bodyTemplate;
  }

  isActiveTemplate(): boolean {
    return this.props.isActive;
  }

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

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }
}
