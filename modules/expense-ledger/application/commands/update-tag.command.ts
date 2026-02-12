import { TagService } from "../services/tag.service";

export class UpdateTagCommand {
  constructor(
    public readonly tagId: string,
    public readonly workspaceId: string,
    public readonly name?: string,
    public readonly color?: string,
  ) {}
}

export class UpdateTagHandler {
  constructor(private readonly tagService: TagService) {}

  async handle(command: UpdateTagCommand) {
    return await this.tagService.updateTag(command.tagId, command.workspaceId, {
      name: command.name,
      color: command.color,
    });
  }
}
