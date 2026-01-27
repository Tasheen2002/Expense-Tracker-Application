// Notification Dispatch Module - Main Entry Point
// Re-export core services for external consumption

// Domain
export * from "./domain/entities";
export * from "./domain/enums";
export * from "./domain/value-objects";
export * from "./domain/errors/notification.errors";

// Application Services
export * from "./application/services";
export * from "./application/providers";

// Infrastructure - Controllers
export * from "./infrastructure/http/controllers";

// Infrastructure - Route Registration
export { registerNotificationDispatchRoutes } from "./infrastructure/http/routes";

// Validation Schemas
export * from "./infrastructure/http/validation";
