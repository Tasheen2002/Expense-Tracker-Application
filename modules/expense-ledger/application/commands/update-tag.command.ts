import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';
import { TagService } from '../services/tag.service';
import { TagDTO } from '../../domain/entities/tag.entity';

export interface UpdateTagCommand extends ICommand {
  readonly tagId: string;
  readonly workspaceId: string;
  readonly name?: string;
  readonly color?: string;
}

export class UpdateTagHandler implements ICommandHandler<
  UpdateTagCommand,
  CommandResult<TagDTO>
> {
  constructor(private readonly tagService: TagService) {}

  async handle(command: UpdateTagCommand): Promise<CommandResult<TagDTO>> {
    const tag = await this.tagService.updateTag(command.tagId, command.workspaceId, {
      name: command.name,
      color: command.color,
    });
    return CommandResult.success(tag);
  }
}
