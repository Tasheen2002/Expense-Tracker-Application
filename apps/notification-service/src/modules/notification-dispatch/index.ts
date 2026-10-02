// Notification Dispatch Module - Public API
// Exposes the module's public types and HTTP registration.

// Domain Enums (used by other modules, e.g. for NotificationType)
export * from './domain/enums';

// Domain Errors (public — ResponseHelper maps statusCode for HTTP responses)
export * from './domain/errors/notification.errors';

// Infrastructure — Route Registration
export { registerNotificationDispatchRoutes } from './infrastructure/http/routes';

// Application — optional in-process event adapter. Production consumes HTTP outbox events.
export { NotificationEventHandler } from './application/handlers/notification.handler';
