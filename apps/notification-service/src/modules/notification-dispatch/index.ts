// Notification Dispatch Module - Public API
// Only exposes what other modules and the app container need

// Domain Enums (used by other modules, e.g. for NotificationType)
export * from './domain/enums';

// Domain Errors (public — ResponseHelper maps statusCode for HTTP responses)
export * from './domain/errors/notification.errors';

// Infrastructure — Route Registration
export { registerNotificationDispatchRoutes } from './infrastructure/http/routes';

// Application — Domain Event Handler (wired up by app container)
export { NotificationEventHandler } from './application/handlers/notification.handler';
