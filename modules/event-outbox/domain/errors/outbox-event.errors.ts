import { DomainError } from '../../../../apps/api/src/shared/domain/errors';

export class OutboxEventError extends DomainError {
  constructor(message: string, statusCode: number, code: string) {
    super(message, code, statusCode);
  }
}

export class OutboxEventNotFoundError extends OutboxEventError {
  constructor(eventId: string) {
    super(
      `Outbox event with ID ${eventId} not found`,
      404,
      'OUTBOX_EVENT_NOT_FOUND'
    );
  }
}

export class OutboxEventProcessingError extends OutboxEventError {
  constructor(eventId: string, reason: string) {
    super(
      `Failed to process outbox event ${eventId}: ${reason}`,
      500,
      'OUTBOX_EVENT_PROCESSING_ERROR'
    );
  }
}

export class InvalidOutboxEventError extends OutboxEventError {
  constructor(message: string) {
    super(message, 400, 'INVALID_OUTBOX_EVENT');
  }
}
