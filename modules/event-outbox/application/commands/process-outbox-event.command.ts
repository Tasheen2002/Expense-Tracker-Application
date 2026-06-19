import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { OutboxEventManagementService } from '../services/outbox-event.service';

export interface ProcessOutboxEventCommand extends ICommand {
  readonly eventId: string;
}

export class ProcessOutboxEventHandler
  implements ICommandHandler<ProcessOutboxEventCommand, CommandResult<void>>
{
  constructor(private readonly outboxEventService: OutboxEventManagementService) {}

  async handle(command: ProcessOutboxEventCommand): Promise<CommandResult<void>> {
    await this.outboxEventService.processEventById(command.eventId);
    return CommandResult.success(undefined);
  }
}
