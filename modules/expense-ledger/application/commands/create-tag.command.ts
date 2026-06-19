import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { TagService } from '../services/tag.service';
import { TagDTO } from '../../domain/entities/tag.entity';

export interface CreateTagCommand extends ICommand {
  readonly workspaceId: string;
  readonly name: string;
  readonly color?: string;
}

export class CreateTagHandler implements ICommandHandler<
  CreateTagCommand,
  CommandResult<TagDTO>
> {
  constructor(private readonly tagService: TagService) {}

  async handle(
    command: CreateTagCommand
  ): Promise<CommandResult<TagDTO>> {
    const dto = await this.tagService.createTag({
      workspaceId: command.workspaceId,
      name: command.name,
      color: command.color,
    });
    return CommandResult.success(dto);
  }
}
