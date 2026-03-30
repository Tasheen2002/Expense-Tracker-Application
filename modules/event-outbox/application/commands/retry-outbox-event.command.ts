import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';
import { OutboxEventService } from '../services/outbox-event.service';
import { OutboxEventId } from '../../domain/value-objects/outbox-event-id';

export interface RetryOutboxEventCommand extends ICommand {
  eventId: string;
}

export class RetryOutboxEventHandler implements ICommandHandler<
  RetryOutboxEventCommand,
  CommandResult<void>
> {
  constructor(private readonly service: OutboxEventService) {}

  async handle(command: RetryOutboxEventCommand): Promise<CommandResult<void>> {
    await this.service.retryFailedEvent(
      OutboxEventId.fromString(command.eventId)
    );
    return CommandResult.success();
  }
}
