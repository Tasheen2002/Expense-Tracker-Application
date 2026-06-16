import { RuleExecutionService } from "../services/rule-execution.service";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { RuleExecution } from "../../domain/entities/rule-execution.entity";
import { IQuery, IQueryHandler } from "../../../../packages/core/src/application/cqrs";

export interface GetExecutionsByWorkspaceQuery extends IQuery {
  readonly workspaceId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class GetExecutionsByWorkspaceHandler implements IQueryHandler<GetExecutionsByWorkspaceQuery, PaginatedResult<RuleExecution>> {
  constructor(private readonly executionService: RuleExecutionService) {}

  async handle(
    query: GetExecutionsByWorkspaceQuery,
  ): Promise<PaginatedResult<RuleExecution>> {
    return await this.executionService.getExecutionsByWorkspaceId(
      WorkspaceId.fromString(query.workspaceId),
      { limit: query.limit, offset: query.offset },
    );
  }
}

