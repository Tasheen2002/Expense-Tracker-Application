import { IOutboxEventRepository } from "../../domain/repositories/outbox-event.repository";
import { OutboxEvent } from "../../domain/entities/outbox-event.entity";

export interface StoreOutboxEventCommand {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, any>;
}

export class StoreOutboxEventHandler {
  constructor(private readonly repository: IOutboxEventRepository) {}

  async handle(command: StoreOutboxEventCommand): Promise<{ eventId: string }> {
    const event = OutboxEvent.create({
      aggregateType: command.aggregateType,
      aggregateId: command.aggregateId,
      eventType: command.eventType,
      payload: command.payload,
    });

    await this.repository.save(event);

    return { eventId: event.id.getValue() };
  }
}
