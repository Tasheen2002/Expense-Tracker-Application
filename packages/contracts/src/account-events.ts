import { z } from 'zod';

export const accountLifecycleAliases = {
  UserCreated: 'identity.user_created',
  'identity.user_created': 'identity.user_created',
  UserEmailVerified: 'identity.user_email_verified',
  'identity.user_email_verified': 'identity.user_email_verified',
  UserPasswordChanged: 'identity.user_password_changed',
  'identity.user_password_changed': 'identity.user_password_changed',
  UserEmailChanged: 'identity.user_email_changed',
  'identity.user_email_changed': 'identity.user_email_changed',
  UserDeactivated: 'identity.user_deactivated',
  'identity.user_deactivated': 'identity.user_deactivated',
  UserActivated: 'identity.user_activated',
  'identity.user_activated': 'identity.user_activated',
  UserProfileUpdated: 'identity.user_profile_updated',
  'identity.user_profile_updated': 'identity.user_profile_updated',
} as const;

export const accountLifecycleTypes = [
  ...new Set(Object.values(accountLifecycleAliases)),
];
export const accountEventEnvelopeSchema = z.object({
  eventId: z
    .string()
    .uuid()
    .transform((value) => value.toLowerCase()),
  eventType: z.string().trim().min(1).max(100),
  aggregateId: z.string().optional(),
  aggregateType: z.string().optional(),
  payload: z.record(z.unknown()).default({}),
  timestamp: z
    .string()
    .datetime({ offset: true })
    .refine((value) => Number.isFinite(Date.parse(value)))
    .optional(),
});
export type AccountEventEnvelope = z.infer<typeof accountEventEnvelopeSchema>;
const uuid = z
  .string()
  .uuid()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  )
  .transform((value) => value.toLowerCase());

// Only these producer contracts may bypass workspace scope. Missing workspace
// on an arbitrary event never turns that event into an account event.
export function accountEventOwner(event: AccountEventEnvelope): string | null {
  const lifecycle = Object.prototype.hasOwnProperty.call(
    accountLifecycleAliases,
    event.eventType
  );
  const notification = [
    'account.notification.created',
    'account.notification.read',
  ].includes(event.eventType);
  if (!lifecycle && !notification) return null;
  const userId = uuid.parse(event.payload.userId);
  const aggregateId = uuid.parse(event.aggregateId);
  if (
    event.payload.workspaceId !== undefined ||
    (event.payload.scope !== undefined && event.payload.scope !== 'account')
  ) {
    throw new Error('Account events cannot carry workspace scope');
  }
  if (lifecycle) {
    if (event.aggregateType !== 'User' || aggregateId !== userId)
      throw new Error('Invalid account event aggregate');
  } else if (
    event.aggregateType !== 'AccountNotification' ||
    event.payload.scope !== 'account' ||
    uuid.parse(event.payload.accountId) !== userId ||
    uuid.parse(event.payload.notificationId) !== aggregateId
  ) {
    throw new Error('Invalid account notification event scope');
  }
  if (
    event.payload.accountId !== undefined &&
    uuid.parse(event.payload.accountId) !== userId
  ) {
    throw new Error('Invalid account event owner');
  }
  return userId;
}

export function canonicalEventJson(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        )
      : item
  );
}
