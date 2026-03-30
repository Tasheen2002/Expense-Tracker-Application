import { TagService } from '../services/tag.service';
import { ReceiptTagDefinition } from '../../domain/entities/receipt-tag-definition.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface UpdateTagCommand extends ICommand {
  tagId: string;
  workspaceId: string;
  name?: string;
  color?: string;
  description?: string;
}

export class UpdateTagHandler implements ICommandHandler<
  UpdateTagCommand,
  CommandResult<void>
> {
  constructor(private readonly tagService: TagService) {}

  async handle(command: UpdateTagCommand): Promise<CommandResult<void>> {
    await this.tagService.updateTag(command.tagId, command.workspaceId, {
      name: command.name,
      color: command.color,
      description: command.description,
    });
    return CommandResult.success();
  }
}
