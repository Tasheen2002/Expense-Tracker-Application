import { CategoryRuleService } from '../services/category-rule.service';
import { RuleId } from '../../domain/value-objects/rule-id';
import { CategoryRuleDTO } from '../../domain/entities/category-rule.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface GetRuleByIdQuery extends IQuery {
  ruleId: string;
  workspaceId: string;
  userId: string;
}

export class GetRuleByIdHandler implements IQueryHandler<
  GetRuleByIdQuery,
  CategoryRuleDTO
> {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async handle(query: GetRuleByIdQuery): Promise<CategoryRuleDTO> {
    return this.ruleService.getRuleById(
      RuleId.fromString(query.ruleId),
      query.workspaceId,
      query.userId
    );
  }
}
