export class OutboxEventError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class OutboxEventNotFoundError extends OutboxEventError {
  constructor(eventId: string) {
    super(
      `Outbox event with ID ${eventId} not found`,
      404,
      "OUTBOX_EVENT_NOT_FOUND",
    );
  }
}

export class OutboxEventProcessingError extends OutboxEventError {
  constructor(eventId: string, reason: string) {
    super(
      `Failed to process outbox event ${eventId}: ${reason}`,
      500,
      "OUTBOX_EVENT_PROCESSING_ERROR",
    );
  }
}

export class InvalidOutboxEventError extends OutboxEventError {
  constructor(message: string) {
    super(message, 400, "INVALID_OUTBOX_EVENT");
  }
}
