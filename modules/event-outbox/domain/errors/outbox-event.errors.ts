export class OutboxEventNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code = "OUTBOX_EVENT_NOT_FOUND";

  constructor(eventId: string) {
    super(`Outbox event with ID ${eventId} not found`);
    this.name = "OutboxEventNotFoundError";
  }
}

export class OutboxEventProcessingError extends Error {
  readonly statusCode = 500;
  readonly code = "OUTBOX_EVENT_PROCESSING_ERROR";

  constructor(eventId: string, reason: string) {
    super(`Failed to process outbox event ${eventId}: ${reason}`);
    this.name = "OutboxEventProcessingError";
  }
}

export class InvalidOutboxEventError extends Error {
  readonly statusCode = 400;
  readonly code = "INVALID_OUTBOX_EVENT";

  constructor(message: string) {
    super(message);
    this.name = "InvalidOutboxEventError";
  }
}
