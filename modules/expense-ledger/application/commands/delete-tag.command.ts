import { TagService } from "../services/tag.service";

export class DeleteTagCommand {
  constructor(
    public readonly tagId: string,
    public readonly workspaceId: string,
  ) {}
}

export class DeleteTagHandler {
  constructor(private readonly tagService: TagService) {}

  async handle(command: DeleteTagCommand): Promise<void> {
    await this.tagService.deleteTag(command.tagId, command.workspaceId);
  }
}
