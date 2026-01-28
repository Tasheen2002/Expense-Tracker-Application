import { ExpenseSplitService } from "../services/expense-split.service";

export class GetSplitQuery {
  constructor(
    public readonly splitId: string,
    public readonly workspaceId: string,
    public readonly userId: string,
  ) {}
}

export class GetSplitHandler {
  constructor(private readonly splitService: ExpenseSplitService) {}

  async handle(query: GetSplitQuery) {
    return await this.splitService.getSplitById(
      query.splitId,
      query.workspaceId,
      query.userId,
    );
  }
}
