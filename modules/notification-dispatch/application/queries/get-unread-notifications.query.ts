import { NotificationService } from "../services/notification.service";

export class GetUnreadNotificationsQuery {
  constructor(
    public readonly recipientId: string,
    public readonly workspaceId: string,
  ) {}
}

export class GetUnreadNotificationsHandler {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(query: GetUnreadNotificationsQuery) {
    return await this.notificationService.getUnreadNotifications(
      query.recipientId,
      query.workspaceId,
    );
  }
}
