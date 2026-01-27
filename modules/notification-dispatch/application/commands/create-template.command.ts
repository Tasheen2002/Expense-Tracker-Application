import { NotificationType } from "../../domain/enums/notification-type.enum";
import { NotificationChannel } from "../../domain/enums/notification-channel.enum";
import {
  TemplateService,
  CreateTemplateParams,
} from "../services/template.service";

export class CreateTemplateCommand {
  constructor(
    public readonly workspaceId: string | undefined,
    public readonly name: string,
    public readonly type: NotificationType,
    public readonly channel: NotificationChannel,
    public readonly subjectTemplate: string,
    public readonly bodyTemplate: string,
  ) {}
}

export class CreateTemplateHandler {
  constructor(private readonly templateService: TemplateService) {}

  async handle(command: CreateTemplateCommand) {
    return await this.templateService.createTemplate({
      workspaceId: command.workspaceId,
      name: command.name,
      type: command.type,
      channel: command.channel,
      subjectTemplate: command.subjectTemplate,
      bodyTemplate: command.bodyTemplate,
    });
  }
}
