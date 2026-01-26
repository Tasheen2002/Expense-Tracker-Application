export class CreateTagCommand {
  constructor(
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly color?: string
  ) {}
}

export class CreateTagHandler {
  constructor(private readonly tagService: any) {}

  async handle(command: CreateTagCommand) {
    return await this.tagService.createTag({
      workspaceId: command.workspaceId,
      name: command.name,
      color: command.color,
    })
  }
}
