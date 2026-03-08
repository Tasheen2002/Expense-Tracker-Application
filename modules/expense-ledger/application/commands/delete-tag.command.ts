import { ICommand, ICommandHandler, CommandResult } from "../../../../apps/api/src/shared/application";
import { TagService } from "../services/tag.service";

export interface DeleteTagCommand extends ICommand {
  readonly tagId: string;
  readonly workspaceId: string;
}

export class DeleteTagHandler implements ICommandHandler<DeleteTagCommand, CommandResult<void>> {
  constructor(private readonly tagService: TagService) {}

  async handle(command: DeleteTagCommand): Promise<CommandResult<void>> {
    try {
      await this.tagService.deleteTag(command.tagId, command.workspaceId);
      return CommandResult.success();
    } catch (error) {
      return CommandResult.failure(
        error instanceof Error ? error.message : "Failed to delete tag",
      );
    }
  }
}
