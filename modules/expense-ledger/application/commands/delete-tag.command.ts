import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';
import { TagService } from '../services/tag.service';

export interface DeleteTagCommand extends ICommand {
  readonly tagId: string;
  readonly workspaceId: string;
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
