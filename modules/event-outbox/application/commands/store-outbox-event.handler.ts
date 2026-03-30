import { IOutboxEventRepository } from "../../domain/repositories/outbox-event.repository";
import { OutboxEvent } from "../../domain/entities/outbox-event.entity";
import { StoreOutboxEventCommand } from "./store-outbox-event.command";

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
