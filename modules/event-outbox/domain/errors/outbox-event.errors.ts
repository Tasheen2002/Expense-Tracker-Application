import { DomainError } from '../../../../packages/core/src/domain/domain-error';

export class OutboxEventError extends DomainError {
  constructor(message: string, code: string, statusCode: number) {
    super(message, code, statusCode);
  }
}

// ─── Validation Errors (400) ─────────────────────────────────────────────────

export class InvalidOutboxEventError extends OutboxEventError {
  constructor(message: string) {
    super(message, 'INVALID_OUTBOX_EVENT', 400);
  }
}

// ─── Not Found Errors (404) ──────────────────────────────────────────────────

export class OutboxEventNotFoundError extends OutboxEventError {
  constructor(eventId?: string) {
    super(
      eventId
        ? `Outbox event with ID ${eventId} not found`
        : 'Outbox event not found',
      'OUTBOX_EVENT_NOT_FOUND',
      404,
    );
  }
}

// ─── Business Rule Violations (422) ──────────────────────────────────────────

export class OutboxEventProcessingError extends OutboxEventError {
  constructor(eventId: string, reason: string) {
    super(
      `Failed to process outbox event ${eventId}: ${reason}`,
      'OUTBOX_EVENT_PROCESSING_ERROR',
      422,
    );
  }
}
