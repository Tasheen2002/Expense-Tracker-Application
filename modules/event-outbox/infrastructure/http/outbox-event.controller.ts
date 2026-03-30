import { FastifyRequest, FastifyReply } from "fastify";
import { StoreOutboxEventHandler } from "../../application/commands/store-outbox-event.handler";
import { ProcessPendingEventsHandler } from "../../application/queries/process-pending-events.handler";
import { GetFailedEventsHandler } from "../../application/queries/get-failed-events.handler";

export class OutboxEventController {
  constructor(
    private readonly storeEventHandler: StoreOutboxEventHandler,
    private readonly processPendingHandler: ProcessPendingEventsHandler,
    private readonly getFailedHandler: GetFailedEventsHandler
  ) {}

  async storeEvent(
    request: FastifyRequest<{
      Body: {
        aggregateType: string;
        aggregateId: string;
        eventType: string;
        payload: Record<string, any>;
      };
    }>,
    reply: FastifyReply
  ) {
    const result = await this.storeEventHandler.handle(request.body);
    return reply.status(201).send(result);
  }

  async getPendingEvents(
    request: FastifyRequest<{
      Querystring: {
        limit?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const limit = request.query.limit ? parseInt(request.query.limit) : undefined;
    const events = await this.processPendingHandler.handle({ limit });
    
    return reply.send({
      events: events.map((e) => e.toJSON()),
      count: events.length,
    });
  }

  async getFailedEvents(
    request: FastifyRequest<{
      Querystring: {
        maxRetries?: string;
        limit?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const maxRetries = request.query.maxRetries ? parseInt(request.query.maxRetries) : 3;
    const limit = request.query.limit ? parseInt(request.query.limit) : undefined;
    
    const events = await this.getFailedHandler.handle({ maxRetries, limit });
    
    return reply.send({
      events: events.map((e) => e.toJSON()),
      count: events.length,
    });
  }
}
