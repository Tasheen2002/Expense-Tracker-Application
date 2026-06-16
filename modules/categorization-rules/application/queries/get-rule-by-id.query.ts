import { CategoryRuleService } from "../services/category-rule.service";
import { RuleId } from "../../domain/value-objects/rule-id";
import { CategoryRule } from "../../domain/entities/category-rule.entity";

import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs'


export interface GetRuleByIdQuery extends IQuery {
  readonly ruleId: string;
  readonly userId: string;
}

export class GetRuleByIdHandler implements IQueryHandler<GetRuleByIdQuery, CategoryRule> {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async handle(query: GetRuleByIdQuery): Promise<CategoryRule> {
    return await this.ruleService.getRuleById(
      RuleId.fromString(query.ruleId),
      query.userId,
    );
  }
}

