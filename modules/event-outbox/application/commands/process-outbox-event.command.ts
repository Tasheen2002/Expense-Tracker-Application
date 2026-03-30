import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';
import { IOutboxEventRepository } from '../../domain/repositories/outbox-event.repository';
import { OutboxEventService } from '../services/outbox-event.service';
import { OutboxEventId } from '../../domain/value-objects/outbox-event-id';
import { OutboxEventNotFoundError } from '../../domain/errors/outbox-event.errors';

export interface ProcessOutboxEventCommand extends ICommand {
  eventId: string;
}

export class ProcessOutboxEventHandler implements ICommandHandler<
  ProcessOutboxEventCommand,
  CommandResult<void>
> {
  constructor(
    private readonly repository: IOutboxEventRepository,
    private readonly service: OutboxEventService
  ) {}

  async handle(
    command: ProcessOutboxEventCommand
  ): Promise<CommandResult<void>> {
    const event = await this.repository.findById(
      OutboxEventId.fromString(command.eventId)
    );
    if (!event) {
      throw new OutboxEventNotFoundError(command.eventId);
    }

    await this.service.processEvent(event);
    return CommandResult.success();
  }
}
