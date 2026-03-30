import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';
import { IOutboxEventRepository } from '../../domain/repositories/outbox-event.repository';
import { OutboxEvent } from '../../domain/entities/outbox-event.entity';

export interface StoreOutboxEventCommand extends ICommand {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export class StoreOutboxEventHandler implements ICommandHandler<
  StoreOutboxEventCommand,
  CommandResult<{ eventId: string }>
> {
  constructor(private readonly repository: IOutboxEventRepository) {}

  async handle(
    command: StoreOutboxEventCommand
  ): Promise<CommandResult<{ eventId: string }>> {
    const event = OutboxEvent.create({
      aggregateType: command.aggregateType,
      aggregateId: command.aggregateId,
      eventType: command.eventType,
      payload: command.payload,
    });

    await this.repository.save(event);

    return CommandResult.success({ eventId: event.id.getValue() });
  }
}
