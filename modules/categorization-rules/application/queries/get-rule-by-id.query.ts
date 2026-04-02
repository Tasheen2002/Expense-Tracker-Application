import { CategoryRuleService } from '../services/category-rule.service';
import { RuleId } from '../../domain/value-objects/rule-id';
import { CategoryRule } from '../../domain/entities/category-rule.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetRuleByIdQuery extends IQuery {
  ruleId: string;
  userId: string;
}

export class GetRuleByIdHandler implements IQueryHandler<
  GetRuleByIdQuery,
  QueryResult<CategoryRule>
> {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async handle(query: GetRuleByIdQuery): Promise<QueryResult<CategoryRule>> {
    const rule = await this.ruleService.getRuleById(
      RuleId.fromString(query.ruleId),
      query.userId
    );

    return QueryResult.success(rule);
  }
}
