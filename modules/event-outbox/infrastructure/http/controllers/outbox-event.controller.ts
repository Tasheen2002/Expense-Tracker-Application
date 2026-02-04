import { FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import { StoreOutboxEventHandler } from "../../../application/commands/store-outbox-event.command";
import { ProcessPendingEventsHandler } from "../../../application/queries/process-pending-events.query";
import { GetFailedEventsHandler } from "../../../application/queries/get-failed-events.query";
import { storeOutboxEventSchema } from "../validation/outbox-event.schema";

export class OutboxEventController {
  constructor(
    private readonly storeEventHandler: StoreOutboxEventHandler,
    private readonly processPendingHandler: ProcessPendingEventsHandler,
    private readonly getFailedHandler: GetFailedEventsHandler,
  ) {}

  async storeEvent(request: AuthenticatedRequest, reply: FastifyReply) {
    const bodyResult = storeOutboxEventSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid request body",
        details: bodyResult.error.errors,
      });
    }

    const result = await this.storeEventHandler.handle(bodyResult.data);
    return reply.status(201).send(result);
  }

  async getPendingEvents(request: AuthenticatedRequest, reply: FastifyReply) {
    const query = request.query as { limit?: string; offset?: string };
    const limit = query.limit ? parseInt(query.limit) : undefined;
    const offset = query.offset ? parseInt(query.offset) : undefined;
    const result = await this.processPendingHandler.handle({ limit, offset });

    return reply.send({
      success: true,
      statusCode: 200,
      message: "Pending events retrieved successfully",
      data: {
        items: result.items.map((e) => e.toJSON()),
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
      },
    });
  }

  async getFailedEvents(request: AuthenticatedRequest, reply: FastifyReply) {
    const query = request.query as {
      maxRetries?: string;
      limit?: string;
      offset?: string;
    };
    const maxRetries = query.maxRetries ? parseInt(query.maxRetries) : 3;
    const limit = query.limit ? parseInt(query.limit) : undefined;
    const offset = query.offset ? parseInt(query.offset) : undefined;

    const result = await this.getFailedHandler.handle({
      maxRetries,
      limit,
      offset,
    });

    return reply.send({
      success: true,
      statusCode: 200,
      message: "Failed events retrieved successfully",
      data: {
        items: result.items.map((e) => e.toJSON()),
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
      },
    });
  }
}
