import { IQuery, IQueryHandler, QueryResult } from "../../../../apps/api/src/shared/application";
import { ExpenseSplitService } from "../services/expense-split.service";

export interface GetSplitQuery extends IQuery {
  readonly splitId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class GetSplitHandler implements IQueryHandler<GetSplitQuery, QueryResult<any>> {
  constructor(private readonly splitService: ExpenseSplitService) {}

  async handle(query: GetSplitQuery): Promise<QueryResult<any>> {
    try {
      const split = await this.splitService.getSplitById(
        query.splitId,
        query.workspaceId,
        query.userId,
      );
      return QueryResult.success(split);
    } catch (error) {
      return QueryResult.failure(
        error instanceof Error ? error.message : "Failed to get split",
      );
    }
  }
}
