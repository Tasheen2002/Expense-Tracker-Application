import { NotificationService } from "../services/notification.service";

export interface MarkAsReadCommand {
  notificationId: string;
  userId: string;
}

export class MarkAsReadHandler {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(command: MarkAsReadCommand) {
    return await this.notificationService.markAsRead(
      command.notificationId,
      command.userId,
    );
  }
}
