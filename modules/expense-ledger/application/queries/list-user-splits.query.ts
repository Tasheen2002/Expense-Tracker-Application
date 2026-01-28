import { ExpenseSplitService } from "../services/expense-split.service";

export class ListUserSplitsQuery {
  constructor(
    public readonly userId: string,
    public readonly workspaceId: string,
    public readonly limit?: number,
    public readonly offset?: number,
  ) {}
}

export class ListUserSplitsHandler {
  constructor(private readonly splitService: ExpenseSplitService) {}

  async handle(query: ListUserSplitsQuery) {
    return await this.splitService.listUserSplits(
      query.userId,
      query.workspaceId,
      {
        limit: query.limit,
        offset: query.offset,
      },
    );
  }
}
