import { TagService } from '../services/tag.service';
import { ReceiptTagDefinitionDTO } from '../../domain/entities/receipt-tag-definition.entity';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface CreateTagCommand extends ICommand {
  workspaceId: string;
  name: string;
  color?: string;
  description?: string;
}

export class CreateTagHandler implements ICommandHandler<
  CreateTagCommand,
  CommandResult<ReceiptTagDefinitionDTO>
> {
  constructor(private readonly tagService: TagService) {}

  async handle(
    command: CreateTagCommand
  ): Promise<CommandResult<ReceiptTagDefinitionDTO>> {
    const tagDTO = await this.tagService.createTag(command);
    return CommandResult.success(tagDTO);
  }
}
