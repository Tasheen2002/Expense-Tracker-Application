import { NotificationService } from "../services/notification.service";

export class MarkAllAsReadCommand {
  constructor(
    public readonly recipientId: string,
    public readonly workspaceId: string,
  ) {}
}

export class MarkAllAsReadHandler {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(command: MarkAllAsReadCommand) {
    return await this.notificationService.markAllAsRead(
      command.recipientId,
      command.workspaceId,
    );
  }
}
