import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import { IWorkspaceAccessPort } from '../ports/workspace-access.port';
import { authorizeWorkspaceRead } from './authorize-workspace-read';
import { RuleExecutionService } from '../services/rule-execution.service';
import {  ExpenseId  } from '@core/domain/value-objects';
import {  WorkspaceId  } from '@core/domain/value-objects';
import { RuleExecutionDTO } from '../../domain/entities/rule-execution.entity';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetExecutionsByExpenseQuery extends IQuery {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class GetExecutionsByExpenseHandler implements IQueryHandler<
  GetExecutionsByExpenseQuery,
  PaginatedResult<RuleExecutionDTO>
> {
  constructor(private readonly executionService: Pick<RuleExecutionService, 'getExecutionsByExpenseId'>, private readonly workspaceAccess: IWorkspaceAccessPort) {}

  async handle(query: GetExecutionsByExpenseQuery): Promise<PaginatedResult<RuleExecutionDTO>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);
    await authorizeWorkspaceRead(query.userId, workspaceId, this.workspaceAccess);
    return this.executionService.getExecutionsByExpenseId(
      ExpenseId.fromString(query.expenseId),
      workspaceId,
      { limit: query.limit, offset: query.offset }
    );
  }
}
