import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { OutboxEventManagementService } from '../services/outbox-event.service';
import { OutboxEventDTO } from '../../domain/entities/outbox-event.entity';

export interface StoreOutboxEventCommand extends ICommand {
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: Record<string, unknown>;
}

export class StoreOutboxEventHandler
  implements ICommandHandler<StoreOutboxEventCommand, CommandResult<OutboxEventDTO>>
{
  constructor(private readonly outboxEventService: OutboxEventManagementService) {}

  async handle(command: StoreOutboxEventCommand): Promise<CommandResult<OutboxEventDTO>> {
    const dto = await this.outboxEventService.storeEvent({
      aggregateType: command.aggregateType,
      aggregateId: command.aggregateId,
      eventType: command.eventType,
      payload: command.payload,
    });
    return CommandResult.success(dto);
  }
}
