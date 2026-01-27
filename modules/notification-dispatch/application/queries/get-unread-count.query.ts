import { NotificationService } from "../services/notification.service";

export class GetUnreadCountQuery {
  constructor(
    public readonly recipientId: string,
    public readonly workspaceId: string,
  ) {}
}

export class GetUnreadCountHandler {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(query: GetUnreadCountQuery) {
    return await this.notificationService.getUnreadCount(
      query.recipientId,
      query.workspaceId,
    );
  }
}
