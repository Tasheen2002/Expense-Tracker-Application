import { NotificationService } from "../services/notification.service";

export class ListNotificationsQuery {
  constructor(
    public readonly recipientId: string,
    public readonly workspaceId: string,
    public readonly limit?: number,
    public readonly offset?: number,
  ) {}
}

export class ListNotificationsHandler {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(query: ListNotificationsQuery) {
    return await this.notificationService.getNotifications(
      query.recipientId,
      query.workspaceId,
      { limit: query.limit, offset: query.offset },
    );
  }
}
