// Base class for all notification-related errors
export class NotificationDomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotificationNotFoundError extends NotificationDomainError {
  constructor(id: string) {
    super(
      `Notification with ID '${id}' not found`,
      "NOTIFICATION_NOT_FOUND",
      404,
    );
  }
}

export class NotificationTemplateNotFoundError extends NotificationDomainError {
  constructor(type: string, channel: string) {
    super(
      `No active template found for type '${type}' and channel '${channel}'`,
      "NOTIFICATION_TEMPLATE_NOT_FOUND",
      404,
    );
  }
}

export class TemplateNotFoundByIdError extends NotificationDomainError {
  constructor(id: string) {
    super(
      `Notification template with ID '${id}' not found`,
      "TEMPLATE_NOT_FOUND",
      404,
    );
  }
}

export class NotificationPreferenceNotFoundError extends NotificationDomainError {
  constructor(userId: string, workspaceId: string) {
    super(
      `Notification preferences not found for user '${userId}' in workspace '${workspaceId}'`,
      "NOTIFICATION_PREFERENCE_NOT_FOUND",
      404,
    );
  }
}

export class NotificationSendFailedError extends NotificationDomainError {
  constructor(channel: string, reason: string) {
    super(
      `Failed to send notification via ${channel}: ${reason}`,
      "NOTIFICATION_SEND_FAILED",
      500,
    );
  }
}

export class InvalidNotificationDataError extends NotificationDomainError {
  constructor(field: string, reason: string) {
    super(
      `Invalid notification data: ${field} - ${reason}`,
      "INVALID_NOTIFICATION_DATA",
      400,
    );
  }
}

export class InvalidIdFormatError extends NotificationDomainError {
  constructor(idType: string, value: string) {
    super(`Invalid ${idType} format: ${value}`, "INVALID_ID_FORMAT", 400);
  }
}

export class UnauthorizedNotificationAccessError extends NotificationDomainError {
  constructor(notificationId: string, userId: string) {
    super(
      `User '${userId}' is not authorized to access notification '${notificationId}'`,
      "UNAUTHORIZED_NOTIFICATION_ACCESS",
      403,
    );
  }
}
