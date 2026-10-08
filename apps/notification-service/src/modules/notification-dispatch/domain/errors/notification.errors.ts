import { DomainError } from '@core/domain/domain-error';

// Base class for all notification-related errors
export class NotificationDomainError extends DomainError {
  constructor(
    message: string,
    code: string,
    statusCode: number = 400
  ) {
    super(message, code, statusCode);
  }
}

export class NotificationNotFoundError extends NotificationDomainError {
  constructor(id: string) {
    super(
      `Notification with ID '${id}' not found`,
      'NOTIFICATION_NOT_FOUND',
      404
    );
  }
}

export class NotificationTemplateNotFoundError extends NotificationDomainError {
  constructor(type: string, channel: string) {
    super(
      `No active template found for type '${type}' and channel '${channel}'`,
      'NOTIFICATION_TEMPLATE_NOT_FOUND',
      404
    );
  }
}

export class TemplateNotFoundByIdError extends NotificationDomainError {
  constructor(id: string) {
    super(
      `Notification template with ID '${id}' not found`,
      'TEMPLATE_NOT_FOUND',
      404
    );
  }
}

export class NotificationPreferenceNotFoundError extends NotificationDomainError {
  constructor(userId: string, workspaceId: string) {
    super(
      `Notification preferences not found for user '${userId}' in workspace '${workspaceId}'`,
      'NOTIFICATION_PREFERENCE_NOT_FOUND',
      404
    );
  }
}

export class NotificationRequestConflictError extends NotificationDomainError {
  constructor() { super('Request ID has already been used for different notification input', 'NOTIFICATION_REQUEST_CONFLICT', 409); }
}

export class NotificationConcurrencyError extends NotificationDomainError {
  constructor() { super('Notification aggregate changed since it was loaded; reload before saving', 'NOTIFICATION_CONCURRENT_UPDATE', 409); }
}

export class NotificationPreferenceAlreadyExistsError extends NotificationDomainError {
  constructor() { super('Preferences already exist for this recipient and workspace', 'NOTIFICATION_PREFERENCE_ALREADY_EXISTS', 409); }
}

export class TemplateAccessDeniedError extends NotificationDomainError {
  constructor() { super('Workspace administrator access is required; global template management is unavailable', 'TEMPLATE_ACCESS_DENIED', 403); }
}

export class TemplateAlreadyExistsError extends NotificationDomainError {
  constructor() { super('A template already exists for this workspace, type and channel', 'TEMPLATE_ALREADY_EXISTS', 409); }
}

export class PreferenceNotFoundByIdError extends NotificationDomainError {
  constructor(id: string) {
    super(`Notification preferences with ID '${id}' not found`, 'PREFERENCE_NOT_FOUND', 404);
  }
}

export class NotificationSendFailedError extends NotificationDomainError {
  constructor(channel: string, reason: string) {
    super(
      `Failed to send notification via ${channel}: ${reason}`,
      'NOTIFICATION_SEND_FAILED',
      500
    );
  }
}

export class InvalidNotificationDataError extends NotificationDomainError {
  constructor(field: string, reason: string) {
    super(
      `Invalid notification data: ${field} - ${reason}`,
      'INVALID_NOTIFICATION_DATA',
      400
    );
  }
}

export class InvalidNotificationStateError extends NotificationDomainError {
  constructor(state: string, action: string) {
    super(`Cannot ${action} notification in ${state} state`, 'INVALID_NOTIFICATION_STATE', 409);
  }
}

export class InvalidIdFormatError extends NotificationDomainError {
  constructor(idType: string, value: string) {
    super(`Invalid ${idType} format: ${value}`, 'INVALID_ID_FORMAT', 400);
  }
}

export class UnauthorizedNotificationAccessError extends NotificationDomainError {
  constructor(notificationId: string, userId: string) {
    super(
      `User '${userId}' is not authorized to access notification '${notificationId}'`,
      'UNAUTHORIZED_NOTIFICATION_ACCESS',
      403
    );
  }
}
