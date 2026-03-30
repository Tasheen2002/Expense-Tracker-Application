import { TagService } from '../services/tag.service';
import { ReceiptTagDefinition } from '../../domain/entities/receipt-tag-definition.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface CreateTagCommand extends ICommand {
  workspaceId: string;
  name: string;
  color?: string;
  description?: string;
}

export class CreateTagHandler implements ICommandHandler<
  CreateTagCommand,
  CommandResult<{ tagId: string }>
> {
  constructor(private readonly tagService: TagService) {}

  async handle(
    command: CreateTagCommand
  ): Promise<CommandResult<{ tagId: string }>> {
    const tag = await this.tagService.createTag(command);
    return CommandResult.success({ tagId: tag.getId().getValue() });
  }
}
