import { CategoryRuleService } from "../services/category-rule.service";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { CategoryRule } from "../../domain/entities/category-rule.entity";
import { IQuery, IQueryHandler } from "../../../../packages/core/src/application/cqrs";

export interface GetRulesByWorkspaceQuery extends IQuery {
  readonly workspaceId: string;
  readonly userId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class GetRulesByWorkspaceHandler implements IQueryHandler<GetRulesByWorkspaceQuery, PaginatedResult<CategoryRule>> {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async handle(
    query: GetRulesByWorkspaceQuery,
  ): Promise<PaginatedResult<CategoryRule>> {
    return await this.ruleService.getRulesByWorkspaceId(
      WorkspaceId.fromString(query.workspaceId),
      query.userId,
      { limit: query.limit, offset: query.offset },
    );
  }
}

