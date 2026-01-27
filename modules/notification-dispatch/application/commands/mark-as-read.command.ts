import { NotificationService } from "../services/notification.service";

export class MarkAsReadCommand {
  constructor(public readonly notificationId: string) {}
}

export class MarkAsReadHandler {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(command: MarkAsReadCommand) {
    return await this.notificationService.markAsRead(command.notificationId);
  }
}
