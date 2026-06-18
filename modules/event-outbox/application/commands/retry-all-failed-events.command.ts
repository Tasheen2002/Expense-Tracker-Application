import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { OutboxEventManagementService } from '../services/outbox-event.service';

export interface RetryAllFailedEventsCommand extends ICommand {}

export class RetryAllFailedEventsHandler
  implements ICommandHandler<RetryAllFailedEventsCommand, CommandResult<{ retried: number; deadLettered: number }>>
{
  constructor(private readonly outboxEventService: OutboxEventManagementService) {}

  async handle(
    _command: RetryAllFailedEventsCommand,
  ): Promise<CommandResult<{ retried: number; deadLettered: number }>> {
    const result = await this.outboxEventService.retryAllFailedEvents();
    return CommandResult.success(result);
  }
}
