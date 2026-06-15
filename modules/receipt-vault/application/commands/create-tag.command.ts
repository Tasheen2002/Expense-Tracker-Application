import { TagService } from '../services/tag.service';
import { ReceiptTagDefinitionDTO } from '../../domain/entities/receipt-tag-definition.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface CreateTagCommand extends ICommand {
  readonly workspaceId: string;
  readonly name: string;
  readonly color?: string;
  readonly description?: string;
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
