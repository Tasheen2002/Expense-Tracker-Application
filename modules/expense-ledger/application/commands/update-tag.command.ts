import { ICommand, ICommandHandler, CommandResult } from "../../../../apps/api/src/shared/application";
import { TagService } from "../services/tag.service";
import { Tag } from "../../domain/entities/tag.entity";

export interface UpdateTagCommand extends ICommand {
  readonly tagId: string;
  readonly workspaceId: string;
  readonly name?: string;
  readonly color?: string;
}

export class UpdateTagHandler implements ICommandHandler<UpdateTagCommand, CommandResult<Tag>> {
  constructor(private readonly tagService: TagService) {}

  async handle(command: UpdateTagCommand): Promise<CommandResult<Tag>> {
    try {
      const tag = await this.tagService.updateTag(
        command.tagId,
        command.workspaceId,
        { name: command.name, color: command.color },
      );
      return CommandResult.success(tag);
    } catch (error) {
      return CommandResult.failure<Tag>(
        error instanceof Error ? error.message : "Failed to update tag",
      );
    }
  }
}
