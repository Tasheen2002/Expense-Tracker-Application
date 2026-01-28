import { CategoryRule } from '../entities/category-rule.entity'
import { RuleId } from '../value-objects/rule-id'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'

export interface CategoryRuleRepository {
  save(rule: CategoryRule): Promise<void>
  findById(id: RuleId): Promise<CategoryRule | null>
  findByWorkspaceId(workspaceId: WorkspaceId): Promise<CategoryRule[]>
  findActiveByWorkspaceId(workspaceId: WorkspaceId): Promise<CategoryRule[]>
  findByName(name: string, workspaceId: WorkspaceId): Promise<CategoryRule | null>
  delete(id: RuleId): Promise<void>
}
