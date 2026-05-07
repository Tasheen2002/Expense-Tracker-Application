import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';
import { OutboxEventManagementService } from '../services/outbox-event.service';
import { OutboxEventId } from '../../domain/value-objects/outbox-event-id.vo';

export interface RetryOutboxEventCommand extends ICommand {
  readonly eventId: string;
}

export class RetryOutboxEventHandler
  implements ICommandHandler<RetryOutboxEventCommand, CommandResult<void>>
{
  constructor(private readonly outboxEventService: OutboxEventManagementService) {}

  async handle(command: RetryOutboxEventCommand): Promise<CommandResult<void>> {
    await this.outboxEventService.retryFailedEvent(OutboxEventId.fromString(command.eventId));
    return CommandResult.success(undefined);
  }
}
