import { NotificationType } from "../../domain/enums/notification-type.enum";
import { NotificationChannel } from "../../domain/enums/notification-channel.enum";
import { TemplateService } from "../services/template.service";

export class GetActiveTemplateQuery {
  constructor(
    public readonly workspaceId: string | undefined,
    public readonly type: NotificationType,
    public readonly channel: NotificationChannel,
  ) {}
}

export class GetActiveTemplateHandler {
  constructor(private readonly templateService: TemplateService) {}

  async handle(query: GetActiveTemplateQuery) {
    return await this.templateService.getActiveTemplate(
      query.workspaceId,
      query.type,
      query.channel,
    );
  }
}
