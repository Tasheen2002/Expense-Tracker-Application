import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';
import { OutboxEventService } from '../services/outbox-event.service';

export interface ProcessOutboxEventCommand extends ICommand {
  eventId: string;
}

export class ProcessOutboxEventHandler implements ICommandHandler<
  ProcessOutboxEventCommand,
  CommandResult<void>
> {
  constructor(private readonly service: OutboxEventService) {}

  async handle(
    command: ProcessOutboxEventCommand
  ): Promise<CommandResult<void>> {
    await this.service.processEventById(command.eventId);
    return CommandResult.success();
  }
}
