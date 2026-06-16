import { CategoryRuleService } from "../services/category-rule.service";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { CategoryRule } from "../../domain/entities/category-rule.entity";
import { IQuery, IQueryHandler } from "../../../../packages/core/src/application/cqrs";

export interface GetActiveRulesByWorkspaceQuery extends IQuery {
  readonly workspaceId: string;
  readonly userId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class GetActiveRulesByWorkspaceHandler implements IQueryHandler<GetActiveRulesByWorkspaceQuery, PaginatedResult<CategoryRule>> {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async handle(
    query: GetActiveRulesByWorkspaceQuery,
  ): Promise<PaginatedResult<CategoryRule>> {
    return await this.ruleService.getActiveRulesByWorkspaceId(
      WorkspaceId.fromString(query.workspaceId),
      query.userId,
      { limit: query.limit, offset: query.offset },
    );
  }
}

