import { TagService } from '../services/tag.service';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface DeleteTagCommand extends ICommand {
  tagId: string;
  workspaceId: string;
}

export class DeleteTagHandler implements ICommandHandler<
  DeleteTagCommand,
  CommandResult<void>
> {
  constructor(private readonly tagService: TagService) {}

  async handle(command: DeleteTagCommand): Promise<CommandResult<void>> {
    await this.tagService.deleteTag(command.tagId, command.workspaceId);
    return CommandResult.success();
  }
}
