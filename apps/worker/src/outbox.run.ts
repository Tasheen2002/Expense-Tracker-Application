import { PrismaClient } from "@prisma/client";
import { OutboxEventRepositoryImpl } from "../../../modules/event-outbox/infrastructure/persistence/outbox-event.repository.impl";
import { OutboxEventService } from "../../../modules/event-outbox/application/services/outbox-event.service";
import { ProcessPendingEventsHandler } from "../../../modules/event-outbox/application/queries/process-pending-events.query";
import { GetFailedEventsHandler } from "../../../modules/event-outbox/application/queries/get-failed-events.query";
import { InMemoryEventBus } from "../../api/src/shared/domain/events/event-bus";
import {
  POLL_INTERVAL_MS,
  MAX_RETRY_COUNT,
  CLEANUP_RETENTION_DAYS,
} from "../../../modules/event-outbox/domain/constants/outbox.constants";

const prisma = new PrismaClient();
const eventBus = new InMemoryEventBus();
const repository = new OutboxEventRepositoryImpl(prisma);
const service = new OutboxEventService(repository, eventBus);
const processPendingHandler = new ProcessPendingEventsHandler(repository);
const getFailedHandler = new GetFailedEventsHandler(repository);

let isShuttingDown = false;

async function processOutboxEvents() {
  console.log(
    `[${new Date().toISOString()}] Starting outbox event processing...`,
  );

  try {
    // Process pending events
    const pendingResult = await processPendingHandler.handle({});
    console.log(
      `[${new Date().toISOString()}] Found ${pendingResult.total} pending events (processing ${pendingResult.items.length})`,
    );

    for (const event of pendingResult.items) {
      try {
        await service.processEvent(event);
        console.log(
          `[${new Date().toISOString()}] Successfully processed event ${event.id.getValue()}`,
        );
      } catch (error) {
        console.error(
          `[${new Date().toISOString()}] Failed to process event ${event.id.getValue()}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    // Retry failed events
    const failedResult = await getFailedHandler.handle({
      maxRetries: MAX_RETRY_COUNT,
    });
    console.log(
      `[${new Date().toISOString()}] Found ${failedResult.total} failed events (processing ${failedResult.items.length})`,
    );

    for (const event of failedResult.items) {
      try {
        await service.processEvent(event);
        console.log(
          `[${new Date().toISOString()}] Successfully retried event ${event.id.getValue()}`,
        );
      } catch (error) {
        console.error(
          `[${new Date().toISOString()}] Failed to retry event ${event.id.getValue()}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error in outbox processing:`,
      error,
    );
  }
}

async function cleanupOldEvents() {
  console.log(
    `[${new Date().toISOString()}] Running cleanup of old processed events...`,
  );

  try {
    const deletedCount = await service.cleanupProcessedEvents(
      CLEANUP_RETENTION_DAYS,
    );
    console.log(
      `[${new Date().toISOString()}] Cleaned up ${deletedCount} old processed events`,
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in cleanup:`, error);
  }
}

async function mainLoop() {
  while (!isShuttingDown) {
    await processOutboxEvents();

    // Run cleanup every hour (12 iterations × 5 seconds)
    const now = new Date();
    if (now.getMinutes() === 0 && now.getSeconds() < POLL_INTERVAL_MS / 1000) {
      await cleanupOldEvents();
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

async function shutdown() {
  console.log(
    `[${new Date().toISOString()}] Received shutdown signal, gracefully shutting down...`,
  );
  isShuttingDown = true;

  // Wait a bit for current processing to finish
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await prisma.$disconnect();
  console.log(`[${new Date().toISOString()}] Worker shut down successfully`);
  process.exit(0);
}

// Handle shutdown signals
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Start the worker
console.log(`[${new Date().toISOString()}] Outbox Worker starting...`);
console.log(
  `[${new Date().toISOString()}] Poll interval: ${POLL_INTERVAL_MS}ms`,
);
console.log(
  `[${new Date().toISOString()}] Max retry count: ${MAX_RETRY_COUNT}`,
);
console.log(
  `[${new Date().toISOString()}] Retention days: ${CLEANUP_RETENTION_DAYS}`,
);

mainLoop().catch((error) => {
  console.error(`[${new Date().toISOString()}] Fatal error in worker:`, error);
  process.exit(1);
});
