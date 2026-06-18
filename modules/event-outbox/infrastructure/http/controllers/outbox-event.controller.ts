import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '@shared/response.helper';
import {
  StoreOutboxEventHandler,
  ProcessOutboxEventHandler,
  RetryOutboxEventHandler,
  RetryAllFailedEventsHandler,
  CleanupProcessedEventsHandler,
  GetPendingEventsHandler,
  GetFailedEventsHandler,
  GetDeadLetterCountHandler,
} from '../../../application';
import {
  WorkspaceParams,
  EventParams,
  StoreOutboxEventBody,
  PendingEventsQuerystring,
  FailedEventsQuerystring,
  CleanupEventsQuerystring,
} from '../validation/outbox-event.schema';

export class OutboxEventController {
  constructor(
    private readonly storeEventHandler: StoreOutboxEventHandler,
    private readonly processEventHandler: ProcessOutboxEventHandler,
    private readonly retryEventHandler: RetryOutboxEventHandler,
    private readonly retryAllHandler: RetryAllFailedEventsHandler,
    private readonly cleanupHandler: CleanupProcessedEventsHandler,
    private readonly getPendingHandler: GetPendingEventsHandler,
    private readonly getFailedHandler: GetFailedEventsHandler,
    private readonly getDeadLetterCountHandler: GetDeadLetterCountHandler,
  ) {}

  // ── Reads ──────────────────────────────────────────────────────────────────

  async getPendingEvents(
    request: AuthenticatedRequest<{ Params: WorkspaceParams; Querystring: PendingEventsQuerystring }>,
    reply: FastifyReply,
  ) {
    try {
      const { limit, offset } = request.query;
      const result = await this.getPendingHandler.handle({
        limit,
        offset,
      });
      return ResponseHelper.ok(reply, 'Pending events retrieved successfully', {
        items: result.items,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getFailedEvents(
    request: AuthenticatedRequest<{ Params: WorkspaceParams; Querystring: FailedEventsQuerystring }>,
    reply: FastifyReply,
  ) {
    try {
      const { maxRetries, limit, offset } = request.query;
      const result = await this.getFailedHandler.handle({
        maxRetries,
        limit,
        offset,
      });
      return ResponseHelper.ok(reply, 'Failed events retrieved successfully', {
        items: result.items,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getDeadLetterCount(
    _request: AuthenticatedRequest<{ Params: WorkspaceParams }>,
    reply: FastifyReply,
  ) {
    try {
      const result = await this.getDeadLetterCountHandler.handle({});
      return ResponseHelper.ok(reply, 'Dead letter count retrieved successfully', result);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  async storeEvent(
    request: AuthenticatedRequest<{ Params: WorkspaceParams; Body: StoreOutboxEventBody }>,
    reply: FastifyReply,
  ) {
    try {
      const { aggregateType, aggregateId, eventType, payload } = request.body;
      const result = await this.storeEventHandler.handle({
        aggregateType,
        aggregateId,
        eventType,
        payload,
      });
      return ResponseHelper.fromCommand(reply, result, 'Outbox event stored successfully', undefined, 201);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async processEvent(
    request: AuthenticatedRequest<{ Params: EventParams }>,
    reply: FastifyReply,
  ) {
    try {
      const { eventId } = request.params;
      const result = await this.processEventHandler.handle({ eventId });
      return ResponseHelper.fromCommand(reply, result, 'Outbox event processed successfully');
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async retryEvent(
    request: AuthenticatedRequest<{ Params: EventParams }>,
    reply: FastifyReply,
  ) {
    try {
      const { eventId } = request.params;
      const result = await this.retryEventHandler.handle({ eventId });
      return ResponseHelper.fromCommand(reply, result, 'Outbox event queued for retry');
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async retryAllFailedEvents(
    _request: AuthenticatedRequest<{ Params: WorkspaceParams }>,
    reply: FastifyReply,
  ) {
    try {
      const result = await this.retryAllHandler.handle({});
      return ResponseHelper.fromCommand(reply, result, 'Failed events queued for retry');
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async cleanupProcessedEvents(
    request: AuthenticatedRequest<{ Params: WorkspaceParams; Querystring: CleanupEventsQuerystring }>,
    reply: FastifyReply,
  ) {
    try {
      const { retentionDays } = request.query;
      const result = await this.cleanupHandler.handle({
        retentionDays,
      });
      return ResponseHelper.fromCommand(reply, result, 'Processed events cleaned up successfully', undefined, 204);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
