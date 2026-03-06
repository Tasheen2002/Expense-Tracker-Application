import { TagService } from "../services/tag.service";

export class CreateTagCommand {
  constructor(
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly color?: string,
  ) {}
}

export class CreateTagHandler {
  constructor(private readonly tagService: TagService) {}

  async handle(command: CreateTagCommand) {
    return await this.tagService.createTag({
      workspaceId: command.workspaceId,
      name: command.name,
      color: command.color,
    });
  }
}
