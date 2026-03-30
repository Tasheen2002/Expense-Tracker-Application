import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';
import { TagService } from '../services/tag.service';

export interface UpdateTagCommand extends ICommand {
  readonly tagId: string;
  readonly workspaceId: string;
  readonly name?: string;
  readonly color?: string;
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
    });
    return CommandResult.success();
  }
}
