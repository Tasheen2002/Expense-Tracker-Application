import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';
import { OutboxEventManagementService } from '../services/outbox-event.service';
import { CLEANUP_RETENTION_DAYS } from '../../domain/constants/outbox.constants';

export interface CleanupProcessedEventsCommand extends ICommand {
  readonly retentionDays?: number;
}

export class CleanupProcessedEventsHandler
  implements ICommandHandler<CleanupProcessedEventsCommand, CommandResult<{ deleted: number }>>
{
  constructor(private readonly outboxEventService: OutboxEventManagementService) {}

  async handle(command: CleanupProcessedEventsCommand): Promise<CommandResult<{ deleted: number }>> {
    const deleted = await this.outboxEventService.cleanupProcessedEvents(
      command.retentionDays ?? CLEANUP_RETENTION_DAYS,
    );
    return CommandResult.success({ deleted });
  }
}
