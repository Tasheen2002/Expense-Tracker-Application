import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';
import { StoreOutboxEventHandler } from '../../../application/commands/store-outbox-event.command';
import { ProcessOutboxEventHandler } from '../../../application/commands/process-outbox-event.command';
import { RetryOutboxEventHandler } from '../../../application/commands/retry-outbox-event.command';
import { RetryAllFailedEventsHandler } from '../../../application/commands/retry-all-failed-events.command';
import { CleanupProcessedEventsHandler } from '../../../application/commands/cleanup-processed-events.command';
import { GetPendingEventsHandler } from '../../../application/queries/get-pending-events.query';
import { GetFailedEventsHandler } from '../../../application/queries/get-failed-events.query';
import { GetDeadLetterCountHandler } from '../../../application/queries/get-dead-letter-count.query';

export class OutboxEventController {
  constructor(
    private readonly storeEventHandler: StoreOutboxEventHandler,
    private readonly processEventHandler: ProcessOutboxEventHandler,
    private readonly retryEventHandler: RetryOutboxEventHandler,
    private readonly retryAllHandler: RetryAllFailedEventsHandler,
    private readonly cleanupHandler: CleanupProcessedEventsHandler,
    private readonly getPendingHandler: GetPendingEventsHandler,
    private readonly getFailedHandler: GetFailedEventsHandler,
    private readonly getDeadLetterCountHandler: GetDeadLetterCountHandler
  ) {}

  async storeEvent(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: {
        aggregateType: string;
        aggregateId: string;
        eventType: string;
        payload: Record<string, unknown>;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const result = await this.storeEventHandler.handle({
        aggregateType: request.body.aggregateType,
        aggregateId: request.body.aggregateId,
        eventType: request.body.eventType,
        payload: request.body.payload,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Outbox event stored successfully',
        result.data,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async processEvent(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; eventId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { eventId } = request.params;
      const result = await this.processEventHandler.handle({ eventId });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Outbox event processed successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async retryEvent(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; eventId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { eventId } = request.params;
      const result = await this.retryEventHandler.handle({ eventId });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Outbox event queued for retry'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async retryAllFailedEvents(
    _request: AuthenticatedRequest<{
      Params: { workspaceId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const result = await this.retryAllHandler.handle({});
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Failed events queued for retry',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async cleanupProcessedEvents(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { retentionDays?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { retentionDays } = request.query;
      const result = await this.cleanupHandler.handle({
        retentionDays: retentionDays ? parseInt(retentionDays, 10) : undefined,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Processed events cleaned up successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getPendingEvents(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { limit?: string; offset?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { limit, offset } = request.query;
      const result = await this.getPendingHandler.handle({
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });
      return ResponseHelper.fromQuery(
        reply,
        result,
        'Pending events retrieved successfully',
        result.data
          ? {
              items: result.data.items.map((e) => e.toJSON()),
              pagination: {
                total: result.data.total,
                limit: result.data.limit,
                offset: result.data.offset,
                hasMore: result.data.hasMore,
              },
            }
          : undefined
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getFailedEvents(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { maxRetries?: string; limit?: string; offset?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { maxRetries, limit, offset } = request.query;
      const result = await this.getFailedHandler.handle({
        maxRetries: maxRetries ? parseInt(maxRetries, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });
      return ResponseHelper.fromQuery(
        reply,
        result,
        'Failed events retrieved successfully',
        result.data
          ? {
              items: result.data.items.map((e) => e.toJSON()),
              pagination: {
                total: result.data.total,
                limit: result.data.limit,
                offset: result.data.offset,
                hasMore: result.data.hasMore,
              },
            }
          : undefined
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getDeadLetterCount(
    _request: AuthenticatedRequest<{
      Params: { workspaceId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const result = await this.getDeadLetterCountHandler.handle({});
      return ResponseHelper.fromQuery(
        reply,
        result,
        'Dead letter count retrieved successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
