import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';
import { OutboxEventService } from '../services/outbox-event.service';

export interface RetryAllFailedEventsCommand extends ICommand {}

export class RetryAllFailedEventsHandler implements ICommandHandler<
  RetryAllFailedEventsCommand,
  CommandResult<{ retried: number; deadLettered: number }>
> {
  constructor(private readonly service: OutboxEventService) {}

  async handle(
    _command: RetryAllFailedEventsCommand
  ): Promise<CommandResult<{ retried: number; deadLettered: number }>> {
    const result = await this.service.retryAllFailedEvents();
    return CommandResult.success(result);
  }
}
