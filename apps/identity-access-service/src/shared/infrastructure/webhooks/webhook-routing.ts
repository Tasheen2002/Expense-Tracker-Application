import { IDENTITY_EVENTS } from '../../events/identity-events';

/**
 * Builds the default webhook routing table using strongly-typed event constants.
 *
 * Placed cleanly in the infrastructure layer to keep domain events free from
 * transport and deployment endpoint concerns.
 */
export function buildWebhookRoutes(config: {
  auditServiceUrl: string;
  notificationServiceUrl: string;
}): Record<string, string[]> {
  const { auditServiceUrl, notificationServiceUrl } = config;

  const auditEndpoint = `${auditServiceUrl}/api/v1/event-outbox/events`;
  const notificationEndpoint = `${notificationServiceUrl}/api/v1/event-outbox/events`;

  return {
    // 1. User lifecycle events
    [IDENTITY_EVENTS.USER_CREATED]: [auditEndpoint, notificationEndpoint],
    [IDENTITY_EVENTS.USER_CREATED_DOT]: [auditEndpoint, notificationEndpoint],
    [IDENTITY_EVENTS.USER_EMAIL_VERIFIED]: [auditEndpoint, notificationEndpoint],
    [IDENTITY_EVENTS.USER_EMAIL_VERIFIED_DOT]: [auditEndpoint, notificationEndpoint],
    [IDENTITY_EVENTS.USER_PASSWORD_CHANGED]: [auditEndpoint, notificationEndpoint],
    [IDENTITY_EVENTS.USER_PASSWORD_CHANGED_DOT]: [auditEndpoint, notificationEndpoint],
    [IDENTITY_EVENTS.USER_EMAIL_CHANGED]: [auditEndpoint, notificationEndpoint],
    [IDENTITY_EVENTS.USER_EMAIL_CHANGED_DOT]: [auditEndpoint, notificationEndpoint],
    [IDENTITY_EVENTS.USER_DEACTIVATED]: [auditEndpoint, notificationEndpoint],
    [IDENTITY_EVENTS.USER_DEACTIVATED_DOT]: [auditEndpoint, notificationEndpoint],
    [IDENTITY_EVENTS.USER_ACTIVATED]: [auditEndpoint],
    [IDENTITY_EVENTS.USER_ACTIVATED_DOT]: [auditEndpoint],
    [IDENTITY_EVENTS.USER_PROFILE_UPDATED]: [auditEndpoint],
    [IDENTITY_EVENTS.USER_PROFILE_UPDATED_DOT]: [auditEndpoint],

    // 2. Workspace lifecycle events
    [IDENTITY_EVENTS.WORKSPACE_CREATED]: [auditEndpoint],
    [IDENTITY_EVENTS.WORKSPACE_CREATED_DOT]: [auditEndpoint],
    [IDENTITY_EVENTS.WORKSPACE_RENAMED]: [auditEndpoint],
    [IDENTITY_EVENTS.WORKSPACE_RENAMED_DOT]: [auditEndpoint],
    [IDENTITY_EVENTS.WORKSPACE_DEACTIVATED]: [auditEndpoint],
    [IDENTITY_EVENTS.WORKSPACE_DEACTIVATED_DOT]: [auditEndpoint],
    [IDENTITY_EVENTS.WORKSPACE_ACTIVATED]: [auditEndpoint],
    [IDENTITY_EVENTS.WORKSPACE_ACTIVATED_DOT]: [auditEndpoint],
    [IDENTITY_EVENTS.WORKSPACE_DELETED]: [auditEndpoint],
    [IDENTITY_EVENTS.WORKSPACE_DELETED_DOT]: [auditEndpoint],
    [IDENTITY_EVENTS.WORKSPACE_OWNERSHIP_TRANSFERRED]: [auditEndpoint, notificationEndpoint],
    [IDENTITY_EVENTS.WORKSPACE_OWNERSHIP_TRANSFERRED_DOT]: [auditEndpoint, notificationEndpoint],

    // 3. Workspace membership events
    [IDENTITY_EVENTS.MEMBER_JOINED]: [auditEndpoint],
    [IDENTITY_EVENTS.MEMBER_JOINED_DOT]: [auditEndpoint],
    [IDENTITY_EVENTS.MEMBER_ROLE_CHANGED]: [auditEndpoint, notificationEndpoint],
    [IDENTITY_EVENTS.MEMBER_ROLE_CHANGED_DOT]: [auditEndpoint, notificationEndpoint],
    [IDENTITY_EVENTS.MEMBER_REMOVED]: [auditEndpoint, notificationEndpoint],
    [IDENTITY_EVENTS.MEMBER_REMOVED_DOT]: [auditEndpoint, notificationEndpoint],

    // 4. Invitation lifecycle events
    [IDENTITY_EVENTS.INVITATION_CREATED]: [auditEndpoint, notificationEndpoint],
    [IDENTITY_EVENTS.INVITATION_CREATED_DOT]: [auditEndpoint, notificationEndpoint],
    [IDENTITY_EVENTS.INVITATION_ACCEPTED]: [auditEndpoint, notificationEndpoint],
    [IDENTITY_EVENTS.INVITATION_ACCEPTED_DOT]: [auditEndpoint, notificationEndpoint],
    [IDENTITY_EVENTS.INVITATION_CANCELLED]: [auditEndpoint],
    [IDENTITY_EVENTS.INVITATION_CANCELLED_DOT]: [auditEndpoint],
  };
}
