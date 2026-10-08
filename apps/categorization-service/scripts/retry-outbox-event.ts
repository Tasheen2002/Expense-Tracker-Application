import dotenv from 'dotenv';
import { PrismaClient } from '../node_modules/.prisma/client-categorization';
import { retryFailedEvent } from '../src/outbox/retry-failed-event';

dotenv.config();
const prisma = new PrismaClient();
async function main() {
  const eventId = process.argv[2];
  if (!eventId) throw new Error('Usage: pnpm outbox:retry <event-id>');
  if (!await retryFailedEvent(prisma, eventId)) throw new Error('Event does not exist or is not failed/dead-lettered');
  console.log('Event requeued. Successful subscriber deliveries were preserved.');
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Retry failed'); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
