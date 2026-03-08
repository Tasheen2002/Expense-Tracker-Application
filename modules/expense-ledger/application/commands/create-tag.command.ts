import { ICommand, ICommandHandler, CommandResult } from "../../../../apps/api/src/shared/application";
import { TagService } from "../services/tag.service";
import { Tag } from "../../domain/entities/tag.entity";

export interface CreateTagCommand extends ICommand {
  readonly workspaceId: string;
  readonly name: string;
  readonly color?: string;
}

export class CreateTagHandler implements ICommandHandler<CreateTagCommand, CommandResult<Tag>> {
  constructor(private readonly tagService: TagService) {}

  async handle(command: CreateTagCommand): Promise<CommandResult<Tag>> {
    try {
      const tag = await this.tagService.createTag({
        workspaceId: command.workspaceId,
        name: command.name,
        color: command.color,
      });
      return CommandResult.success(tag);
    } catch (error) {
      return CommandResult.failure<Tag>(
        error instanceof Error ? error.message : "Failed to create tag",
      );
    }
  }
}
