import { CategoryRuleService } from "../services/category-rule.service";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { CategoryRule } from "../../domain/entities/category-rule.entity";

export interface GetRulesByWorkspaceQuery {
  workspaceId: string;
  userId: string;
  limit?: number;
  offset?: number;
}

export class GetRulesByWorkspaceHandler {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async execute(
    query: GetRulesByWorkspaceQuery,
  ): Promise<PaginatedResult<any>> {
    const result = await this.ruleService.getRulesByWorkspaceId(
      WorkspaceId.fromString(query.workspaceId),
      query.userId,
      { limit: query.limit, offset: query.offset },
    );

    return {
      items: result.items.map((rule: CategoryRule) => ({
        id: rule.getId().getValue(),
        workspaceId: rule.getWorkspaceId().getValue(),
        name: rule.getName(),
        description: rule.getDescription(),
        priority: rule.getPriority(),
        isActive: rule.getIsActive(),
        condition: {
          type: rule.getCondition().getType(),
          value: rule.getCondition().getValue(),
        },
        targetCategoryId: rule.getTargetCategoryId().getValue(),
        createdBy: rule.getCreatedBy().getValue(),
        createdAt: rule.getCreatedAt(),
        updatedAt: rule.getUpdatedAt(),
      })),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    };
  }
}
