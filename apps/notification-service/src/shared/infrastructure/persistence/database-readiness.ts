import { PrismaClient } from '../../../prisma-client';

export async function verifyDatabaseReadiness(prisma: Pick<PrismaClient, '$queryRaw'>): Promise<void> {
  // LIMIT 0 resolves the required tables and columns without scanning user data.
  await prisma.$queryRaw`
    SELECT n.revision, p.revision, t.revision, e.retry_deadline, r.fingerprint, o.lease_token,
           an.user_id, ar.fingerprint, ap.in_app_enabled
    FROM notification_dispatch.notifications n,
         notification_dispatch.notification_preferences p,
         notification_dispatch.notification_templates t,
         notification_dispatch.email_deliveries e,
         notification_dispatch.notification_requests r,
         notification_dispatch.outbox_event o,
         notification_dispatch.account_notifications an,
         notification_dispatch.account_notification_requests ar,
         notification_dispatch.account_notification_preferences ap LIMIT 0`;
}
