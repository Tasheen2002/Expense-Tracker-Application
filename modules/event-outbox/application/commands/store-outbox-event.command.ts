import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';
import { OutboxEventService } from '../services/outbox-event.service';
import { OutboxEventDTO } from '../../domain/entities/outbox-event.entity';

export interface StoreOutboxEventCommand extends ICommand {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export class StoreOutboxEventHandler implements ICommandHandler<
  StoreOutboxEventCommand,
  CommandResult<OutboxEventDTO>
> {
  constructor(private readonly service: OutboxEventService) {}

  async handle(
    command: StoreOutboxEventCommand
  ): Promise<CommandResult<OutboxEventDTO>> {
    const dto = await this.service.storeEvent({
      aggregateType: command.aggregateType,
      aggregateId: command.aggregateId,
      eventType: command.eventType,
      payload: command.payload,
    });
    return CommandResult.success(dto);
  }
}
