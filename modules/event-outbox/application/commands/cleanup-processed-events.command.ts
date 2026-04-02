import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';
import { OutboxEventService } from '../services/outbox-event.service';
import { CLEANUP_RETENTION_DAYS } from '../../domain/constants/outbox.constants';

export interface CleanupProcessedEventsCommand extends ICommand {
  retentionDays?: number;
}

export class CleanupProcessedEventsHandler implements ICommandHandler<
  CleanupProcessedEventsCommand,
  CommandResult<{ deleted: number }>
> {
  constructor(private readonly service: OutboxEventService) {}

  async handle(
    command: CleanupProcessedEventsCommand
  ): Promise<CommandResult<{ deleted: number }>> {
    const days = command.retentionDays ?? CLEANUP_RETENTION_DAYS;
    const deleted = await this.service.cleanupProcessedEvents(days);
    return CommandResult.success({ deleted });
  }
}
