import { TagService } from '../services/tag.service';
import { ReceiptTagDefinitionDTO } from '../../domain/entities/receipt-tag-definition.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface UpdateTagCommand extends ICommand {
  readonly tagId: string;
  readonly workspaceId: string;
  readonly name?: string;
  readonly color?: string;
  readonly description?: string;
}

export class UpdateTagHandler implements ICommandHandler<
  UpdateTagCommand,
  CommandResult<ReceiptTagDefinitionDTO>
> {
  constructor(private readonly tagService: TagService) {}

  async handle(command: UpdateTagCommand): Promise<CommandResult<ReceiptTagDefinitionDTO>> {
    const tagDTO = await this.tagService.updateTag(command.tagId, command.workspaceId, {
      name: command.name,
      color: command.color,
      description: command.description,
    });
    return CommandResult.success(tagDTO);
  }
}
