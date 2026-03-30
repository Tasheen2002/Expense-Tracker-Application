import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';
import { TagService } from '../services/tag.service';
import { Tag } from '../../domain/entities/tag.entity';

export interface CreateTagCommand extends ICommand {
  readonly workspaceId: string;
  readonly name: string;
  readonly color?: string;
}

export class CreateTagHandler implements ICommandHandler<
  CreateTagCommand,
  CommandResult<{ tagId: string }>
> {
  constructor(private readonly tagService: TagService) {}

  async handle(
    command: CreateTagCommand
  ): Promise<CommandResult<{ tagId: string }>> {
    const tag = await this.tagService.createTag({
      workspaceId: command.workspaceId,
      name: command.name,
      color: command.color,
    });
    return CommandResult.success({ tagId: tag.id.getValue() });
  }
}
