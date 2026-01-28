import { ExpenseSplitService } from "../services/expense-split.service";
import { SettlementStatus } from "../../domain/enums/settlement-status";

export class ListUserSettlementsQuery {
  constructor(
    public readonly userId: string,
    public readonly workspaceId: string,
    public readonly status?: SettlementStatus,
    public readonly limit?: number,
    public readonly offset?: number,
  ) {}
}

export class ListUserSettlementsHandler {
  constructor(private readonly splitService: ExpenseSplitService) {}

  async handle(query: ListUserSettlementsQuery) {
    return await this.splitService.getUserSettlements(
      query.userId,
      query.workspaceId,
      query.status,
      {
        limit: query.limit,
        offset: query.offset,
      },
    );
  }
}
