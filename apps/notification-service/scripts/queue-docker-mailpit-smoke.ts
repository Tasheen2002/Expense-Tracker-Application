import { PrismaClient } from '../src/prisma-client';
import { createCompositionRoot } from '../src/composition-root';
import { NotificationType } from '../src/modules/notification-dispatch/domain/enums';

// An opt-in internal-command harness, never a public HTTP endpoint.
async function main() {
  if (process.env.NOTIFICATION_EMAIL_PROVIDER !== 'mailpit' || process.env.NODE_ENV === 'production') {
    throw new Error('This smoke harness requires non-production Mailpit delivery');
  }
  const [workspaceId, recipientId, requestId] = process.argv.slice(2);
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (![workspaceId, recipientId, requestId].every(value => value && uuid.test(value))) {
    throw new Error('Expected workspace, recipient and request UUID arguments');
  }
  const prisma = new PrismaClient();
  try {
    const root = createCompositionRoot(prisma);
    const result = await root.sendNotificationHandler.handle({
      workspaceId, recipientId, requestId, type: NotificationType.SYSTEM_ALERT,
      title: `Docker Mailpit smoke ${requestId}`,
      content: '<p>Local Docker email worker delivery verification.</p>', data: {},
    });
    const email = result.data?.find(notification => notification.channel === 'EMAIL');
    if (!email) throw new Error('Email channel was not queued');
    console.log(JSON.stringify({ notificationId: email.id }));
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
