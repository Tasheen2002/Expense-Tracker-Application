import { IRuleEvaluationPort } from '../application/ports/rule-evaluation.port';
import { randomUUID } from 'node:crypto';
import { describe, it, expect, vi } from 'vitest';
import { WorkspaceId, UserId, CategoryId, ExpenseId } from '@core/domain/value-objects';
import { CategoryRule } from '../domain/entities/category-rule.entity';
import { RuleCondition } from '../domain/value-objects/rule-condition';
import { RuleConditionType } from '../domain/enums/rule-condition-type';
import { CategoryRuleService } from '../application/services/category-rule.service';
import { RuleExecutionService } from '../application/services/rule-execution.service';
import { CategorySuggestionService } from '../application/services/category-suggestion.service';
import { ICategoryRuleRepository } from '../domain/repositories/category-rule.repository';
import { IRuleExecutionRepository } from '../domain/repositories/rule-execution.repository';
import { ICategorySuggestionRepository } from '../domain/repositories/category-suggestion.repository';
import { UnauthorizedRuleAccessError, InvalidRuleConditionError } from '../domain/errors/categorization-rules.errors';

const workspaceId = WorkspaceId.fromString(randomUUID());
const actor = UserId.fromString(randomUUID());
const expenseId = ExpenseId.fromString(randomUUID());
function rule(value = 'match') {
  const result = CategoryRule.create({ workspaceId, createdBy: actor, name: randomUUID(),
    condition: RuleCondition.create(RuleConditionType.MERCHANT_EQUALS, value),
    targetCategoryId: CategoryId.fromString(randomUUID()) });
  result.clearDomainEvents();
  return result;
}
function repository(): ICategoryRuleRepository {
  return { save: vi.fn(), delete: vi.fn(), findById: vi.fn(), findByName: vi.fn(),
    findIncludingDeleted: vi.fn(), findByWorkspaceId: vi.fn(), findActiveByWorkspaceId: vi.fn() };
}
const page = <T>(items: T[], hasMore = false, offset = 0) => ({ items, total: 101, limit: 100, offset, hasMore });

describe('Category rule service privileges and no-op behavior', () => {
  it.each(['update', 'delete', 'activate', 'deactivate'] as const)('denies %s by a former administrator even when they created the rule', async operation => {
    const repo = repository(), entity = rule();
    vi.mocked(repo.findById).mockResolvedValue(entity);
    const service = new CategoryRuleService(repo, { isAdminOrOwner: vi.fn().mockResolvedValue(false), isMember: vi.fn().mockResolvedValue(true) }, { ensureCategory: vi.fn() });
    const promise = operation === 'update'
      ? service.updateRule({ ruleId: entity.id, workspaceId: workspaceId.getValue(), userId: actor.getValue(), name: 'changed' })
      : operation === 'delete' ? service.deleteRule(entity.id, workspaceId.getValue(), actor.getValue())
      : operation === 'activate' ? service.activateRule(entity.id, workspaceId.getValue(), actor.getValue())
      : service.deactivateRule(entity.id, workspaceId.getValue(), actor.getValue());
    await expect(promise).rejects.toBeInstanceOf(UnauthorizedRuleAccessError);
    expect(repo.save).not.toHaveBeenCalled(); expect(repo.delete).not.toHaveBeenCalled();
    expect(repo.findById).not.toHaveBeenCalled();
    expect(entity.domainEvents).toHaveLength(0);
  });

  it('allows a verified member to read rules without administrator privileges', async () => {
    const repo = repository(), entity = rule();
    vi.mocked(repo.findById).mockResolvedValue(entity);
    vi.mocked(repo.findByWorkspaceId).mockResolvedValue(page([entity]));
    vi.mocked(repo.findActiveByWorkspaceId).mockResolvedValue(page([entity]));
    const access = { isAdminOrOwner: vi.fn().mockResolvedValue(false), isMember: vi.fn().mockResolvedValue(true) };
    const service = new CategoryRuleService(repo, access, { ensureCategory: vi.fn() });
    expect((await service.getRuleById(entity.id, workspaceId.getValue(), actor.getValue())).id).toBe(entity.id.getValue());
    expect((await service.getRulesByWorkspaceId(workspaceId, actor.getValue())).items).toHaveLength(1);
    expect((await service.getActiveRulesByWorkspaceId(workspaceId, actor.getValue())).items).toHaveLength(1);
    expect(access.isAdminOrOwner).not.toHaveBeenCalled();
  });

  it('rejects a non-member read', async () => {
    const repo = repository();
    const service = new CategoryRuleService(repo, { isAdminOrOwner: vi.fn(), isMember: vi.fn().mockResolvedValue(false) }, { ensureCategory: vi.fn() });
    await expect(service.getRulesByWorkspaceId(workspaceId, actor.getValue())).rejects.toBeInstanceOf(UnauthorizedRuleAccessError);
    expect(repo.findByWorkspaceId).not.toHaveBeenCalled();
  });

  it('checks membership before looking up a single rule', async () => {
    const repo = repository(), entity = rule();
    const service = new CategoryRuleService(repo, { isAdminOrOwner: vi.fn(), isMember: vi.fn().mockResolvedValue(false) }, { ensureCategory: vi.fn() });
    await expect(service.getRuleById(entity.id, workspaceId.getValue(), actor.getValue())).rejects.toBeInstanceOf(UnauthorizedRuleAccessError);
    expect(repo.findById).not.toHaveBeenCalled();
  });

  it('does not persist unchanged updates or repeated activation', async () => {
    const repo = repository(), entity = rule();
    vi.mocked(repo.findById).mockResolvedValue(entity);
    const service = new CategoryRuleService(repo, { isAdminOrOwner: vi.fn().mockResolvedValue(true), isMember: vi.fn() }, { ensureCategory: vi.fn() });
    const originalTime = entity.updatedAt.getTime();
    await service.updateRule({ ruleId: entity.id, workspaceId: workspaceId.getValue(), userId: actor.getValue(), name: entity.name });
    await service.activateRule(entity.id, workspaceId.getValue(), actor.getValue());
    expect(repo.save).not.toHaveBeenCalled(); expect(entity.updatedAt.getTime()).toBe(originalTime);
  });
});

describe('Rule evaluation', () => {
  function evaluationWriter(): IRuleEvaluationPort { return { commit: vi.fn() }; }
  function executionRepository(): IRuleExecutionRepository {
    return { findById: vi.fn(), findByRuleId: vi.fn(), findByExpenseId: vi.fn(), findByWorkspaceId: vi.fn() };
  }
  it('evaluates rules beyond the first hundred and commits only the matching rule', async () => {
    const repo = repository(), executions = executionRepository(), writer = evaluationWriter(), match = rule();
    vi.mocked(repo.findActiveByWorkspaceId).mockResolvedValueOnce(page(Array.from({ length: 100 }, () => rule('different')), true))
      .mockResolvedValueOnce(page([match], false, 100));
    const result = await new RuleExecutionService(repo, executions, writer).evaluateAndApplyRules({ expenseOwnerId: actor, workspaceId, expenseId, expenseData: { amount: 10, merchant: 'match' } });
    expect(result.appliedRule?.id).toBe(match.id.getValue());
    expect(repo.findActiveByWorkspaceId).toHaveBeenNthCalledWith(2, workspaceId, { limit: 100, offset: 100 });
    expect(writer.commit).toHaveBeenCalledTimes(1);
  });
  it('stops at the first matching rule', async () => {
    const repo = repository(), executions = executionRepository(), writer = evaluationWriter(), first = rule();
    vi.mocked(repo.findActiveByWorkspaceId).mockResolvedValue(page([first, rule()], true));
    const result = await new RuleExecutionService(repo, executions, writer).evaluateAndApplyRules({ expenseOwnerId: actor, workspaceId, expenseId, expenseData: { amount: 0, merchant: 'match' } });
    expect(result.appliedRule?.id).toBe(first.id.getValue());
    expect(repo.findActiveByWorkspaceId).toHaveBeenCalledTimes(1);
  });
  it.each([NaN, Infinity, -1])('rejects invalid amount %s even with no active rules', async amount => {
    const repo = repository(), executions = executionRepository(), writer = evaluationWriter();
    await expect(new RuleExecutionService(repo, executions, writer).evaluateAndApplyRules({ expenseOwnerId: actor, workspaceId, expenseId, expenseData: { amount } })).rejects.toBeInstanceOf(InvalidRuleConditionError);
    expect(repo.findActiveByWorkspaceId).not.toHaveBeenCalled(); expect(writer.commit).not.toHaveBeenCalled();
  });
  it('propagates persistence failure rather than returning a successful suggestion', async () => {
    const repo = repository(), executions = executionRepository(), writer = evaluationWriter();
    vi.mocked(repo.findActiveByWorkspaceId).mockResolvedValue(page([rule()]));
    vi.mocked(writer.commit).mockRejectedValue(new Error('outbox failed'));
    await expect(new RuleExecutionService(repo, executions, writer).evaluateAndApplyRules({ expenseOwnerId: actor, workspaceId, expenseId, expenseData: { amount: 1, merchant: 'match' } })).rejects.toThrow('outbox failed');
  });
  it('forwards expense history pagination and preserves its metadata', async () => {
    const executions = executionRepository(), writer = evaluationWriter();
    vi.mocked(executions.findByExpenseId).mockResolvedValue({ items: [], total: 75, limit: 10, offset: 50, hasMore: true });
    const result = await new RuleExecutionService(repository(), executions, writer).getExecutionsByExpenseId(expenseId, workspaceId, { limit: 10, offset: 50 });
    expect(executions.findByExpenseId).toHaveBeenCalledWith(expenseId, workspaceId, { limit: 10, offset: 50 });
    expect(result).toEqual({ items: [], total: 75, limit: 10, offset: 50, hasMore: true });
  });
});

it('forwards suggestion pagination without discarding metadata', async () => {
  const repo: ICategorySuggestionRepository = { save: vi.fn(), findById: vi.fn(), findByExpenseId: vi.fn(), findPendingByWorkspaceId: vi.fn(), findByWorkspaceId: vi.fn(), delete: vi.fn() };
  vi.mocked(repo.findByExpenseId).mockResolvedValue({ items: [], total: 75, limit: 10, offset: 50, hasMore: true });
  const result = await new CategorySuggestionService(repo).getSuggestionsByExpenseId(expenseId, workspaceId, { limit: 10, offset: 50 });
  expect(repo.findByExpenseId).toHaveBeenCalledWith(expenseId, workspaceId, { limit: 10, offset: 50 });
  expect(result.hasMore).toBe(true);
});
