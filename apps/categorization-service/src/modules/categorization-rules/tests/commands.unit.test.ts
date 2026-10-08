import { randomUUID } from 'node:crypto';
import { describe, it, expect, vi } from 'vitest';
import { WorkspaceId, UserId, CategoryId, ExpenseId } from '@core/domain/value-objects';
import { RuleId, SuggestionId, RuleCondition, ConfidenceScore } from '../domain/value-objects';
import { RuleConditionType } from '../domain/enums';
import { InvalidRuleConditionError, UnauthorizedCategorizationAccessError } from '../domain/errors';
import {
  CreateCategoryRuleHandler, UpdateCategoryRuleHandler, DeleteCategoryRuleHandler,
  ActivateCategoryRuleHandler, DeactivateCategoryRuleHandler, CreateSuggestionHandler,
  AcceptSuggestionHandler, RejectSuggestionHandler, DeleteSuggestionHandler, EvaluateRulesHandler,
} from '../application/commands';

const ids = { workspaceId: randomUUID(), userId: randomUUID(), ruleId: randomUUID(),
  suggestionId: randomUUID(), expenseId: randomUUID(), categoryId: randomUUID() };
const workspace = WorkspaceId.fromString(ids.workspaceId);
const condition = RuleCondition.create(RuleConditionType.MERCHANT_EQUALS, 'Shop');
const expenseOwnerId = randomUUID();
const expenseData = { amount: 10, merchant: 'Shop' };

function fixture() {
  const ruleDto = { id: ids.ruleId, workspaceId: ids.workspaceId, name: 'Rule', description: null,
    priority: 1, isActive: true, condition: { type: 'MERCHANT_EQUALS', value: 'Shop' },
    targetCategoryId: ids.categoryId, createdBy: ids.userId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const suggestionDto = { id: ids.suggestionId, workspaceId: ids.workspaceId, expenseId: ids.expenseId,
    suggestedCategoryId: ids.categoryId, confidence: 0.9, reason: null, isAccepted: null,
    createdAt: new Date(), respondedAt: null };
  const ruleService = { createRule: vi.fn().mockResolvedValue(ruleDto), updateRule: vi.fn().mockResolvedValue(ruleDto),
    activateRule: vi.fn().mockResolvedValue(ruleDto), deactivateRule: vi.fn().mockResolvedValue(ruleDto), deleteRule: vi.fn().mockResolvedValue(undefined) };
  const suggestionService = { getSuggestionById: vi.fn().mockResolvedValue(suggestionDto), createSuggestion: vi.fn().mockResolvedValue(suggestionDto), acceptSuggestion: vi.fn().mockResolvedValue(suggestionDto),
    rejectSuggestion: vi.fn().mockResolvedValue(suggestionDto), deleteSuggestion: vi.fn().mockResolvedValue(undefined) };
  const executionService = { evaluateAndApplyRules: vi.fn().mockResolvedValue({ appliedRule: null, suggestedCategoryId: null, execution: null, suggestion: null }) };
  const access = { isAdminOrOwner: vi.fn().mockResolvedValue(true), isMember: vi.fn() };
  const acceptance = { validate: vi.fn().mockResolvedValue({ expenseVersion: 7 }) };
  const references = { readExpense: vi.fn().mockResolvedValue({ expenseOwnerId, expenseData }), ensureCategory: vi.fn().mockResolvedValue(undefined) };
  const createRule = new CreateCategoryRuleHandler(ruleService);
  const updateRule = new UpdateCategoryRuleHandler(ruleService);
  const cases = [
    { name: 'create rule', spy: ruleService.createRule, run: () => createRule.handle({ workspaceId: ids.workspaceId, createdBy: ids.userId, name: 'Rule',
      priority: 1, conditionType: 'MERCHANT_EQUALS', conditionValue: 'Shop', targetCategoryId: ids.categoryId }),
      args: [{ workspaceId: workspace, createdBy: UserId.fromString(ids.userId), name: 'Rule', priority: 1, description: undefined, condition, targetCategoryId: CategoryId.fromString(ids.categoryId) }], guarded: false },
    { name: 'update rule', spy: ruleService.updateRule, run: () => updateRule.handle({ ...ids, name: 'Changed', description: null, priority: 0,
      conditionType: 'MERCHANT_EQUALS', conditionValue: 'Shop', targetCategoryId: ids.categoryId }),
      args: [{ ruleId: RuleId.fromString(ids.ruleId), workspaceId: ids.workspaceId, userId: ids.userId, name: 'Changed', description: null, priority: 0, condition, targetCategoryId: CategoryId.fromString(ids.categoryId) }], guarded: false },
    { name: 'delete rule', spy: ruleService.deleteRule, run: () => new DeleteCategoryRuleHandler(ruleService).handle(ids), args: [RuleId.fromString(ids.ruleId), ids.workspaceId, ids.userId], guarded: false },
    { name: 'activate rule', spy: ruleService.activateRule, run: () => new ActivateCategoryRuleHandler(ruleService).handle(ids), args: [RuleId.fromString(ids.ruleId), ids.workspaceId, ids.userId], guarded: false },
    { name: 'deactivate rule', spy: ruleService.deactivateRule, run: () => new DeactivateCategoryRuleHandler(ruleService).handle(ids), args: [RuleId.fromString(ids.ruleId), ids.workspaceId, ids.userId], guarded: false },
    { name: 'create suggestion', spy: suggestionService.createSuggestion, run: () => new CreateSuggestionHandler(suggestionService, access, references).handle({ ...ids, suggestedCategoryId: ids.categoryId, confidence: 0.9, reason: 'Matched' }),
      args: [{ expenseOwnerId: UserId.fromString(expenseOwnerId), workspaceId: workspace, expenseId: ExpenseId.fromString(ids.expenseId), suggestedCategoryId: CategoryId.fromString(ids.categoryId), confidence: ConfidenceScore.high(), reason: 'Matched' }], guarded: true },
    { name: 'accept suggestion', spy: suggestionService.acceptSuggestion, run: () => new AcceptSuggestionHandler(suggestionService, access, acceptance).handle(ids), args: [SuggestionId.fromString(ids.suggestionId), workspace, ids.userId, 7], guarded: true },
    { name: 'reject suggestion', spy: suggestionService.rejectSuggestion, run: () => new RejectSuggestionHandler(suggestionService, access).handle(ids), args: [SuggestionId.fromString(ids.suggestionId), workspace], guarded: true },
    { name: 'delete suggestion', spy: suggestionService.deleteSuggestion, run: () => new DeleteSuggestionHandler(suggestionService, access).handle(ids), args: [SuggestionId.fromString(ids.suggestionId), workspace], guarded: true },
    { name: 'evaluate rules', spy: executionService.evaluateAndApplyRules, run: () => new EvaluateRulesHandler(executionService, access, references).handle({ ...ids, expenseData }), args: [{ expenseOwnerId: UserId.fromString(expenseOwnerId), workspaceId: workspace, expenseId: ExpenseId.fromString(ids.expenseId), expenseData }], guarded: true },
  ];
  return { cases, access, references, acceptance, ruleService, suggestionService, executionService, createRule, updateRule };
}

describe('All ten categorization commands', () => {
  const names = fixture().cases.map(test => test.name);
  it.each(names)('%s maps the correct IDs, actor and fields and awaits its service', async name => {
    const f = fixture(), test = f.cases.find(test => test.name === name)!;
    const result = await test.run();
    expect(result.success).toBe(true);
    expect(test.spy).toHaveBeenCalledTimes(1);
    expect(test.spy).toHaveBeenCalledWith(...test.args);
    if (test.guarded) {
      expect(f.access.isAdminOrOwner).toHaveBeenCalledTimes(1);
      expect(f.access.isAdminOrOwner).toHaveBeenCalledWith(UserId.fromString(ids.userId), workspace);
    }
  });
  it.each(names)('%s propagates service failure without returning success', async name => {
    const test = fixture().cases.find(test => test.name === name)!;
    const failure = new Error('Persistence failed'); test.spy.mockRejectedValue(failure);
    await expect(test.run()).rejects.toBe(failure);
  });
  const guardedNames = fixture().cases.filter(test => test.guarded).map(test => test.name);
  it.each(guardedNames)('%s rejects a denied actor before calling its service', async name => {
    const f = fixture(), test = f.cases.find(test => test.name === name)!;
    f.access.isAdminOrOwner.mockResolvedValue(false);
    await expect(test.run()).rejects.toBeInstanceOf(UnauthorizedCategorizationAccessError);
    expect(test.spy).not.toHaveBeenCalled();
  });
  it.each(guardedNames)('%s propagates authorization dependency failure before calling its service', async name => {
    const f = fixture(), test = f.cases.find(test => test.name === name)!;
    const failure = Object.assign(new Error('Identity unavailable'), { statusCode: 503 });
    f.access.isAdminOrOwner.mockRejectedValue(failure);
    await expect(test.run()).rejects.toBe(failure); expect(test.spy).not.toHaveBeenCalled();
  });
});

describe('Rule condition updates', () => {
  it('evaluates stored expense data instead of a forged caller snapshot', async () => {
    const f = fixture();
    await new EvaluateRulesHandler(f.executionService, f.access, f.references).handle({ ...ids, expenseData: { amount: 999, merchant: 'forged' } });
    expect(f.executionService.evaluateAndApplyRules).toHaveBeenCalledWith(expect.objectContaining({ expenseData }));
  });
  it('does not create a suggestion when its category belongs to another workspace', async () => {
    const f = fixture(); f.references.ensureCategory.mockRejectedValue(Object.assign(new Error('Foreign category'), { statusCode: 404 }));
    await expect(f.cases.find(test => test.name === 'create suggestion')!.run()).rejects.toMatchObject({ statusCode: 404 });
    expect(f.suggestionService.createSuggestion).not.toHaveBeenCalled();
  });
  it('does not accept or publish when the external expense/category check fails', async () => {
    const f = fixture();
    const failure = Object.assign(new Error('Expense changed'), { statusCode: 409 });
    f.acceptance.validate.mockRejectedValue(failure);
    await expect(f.cases.find(test => test.name === 'accept suggestion')!.run()).rejects.toBe(failure);
    expect(f.suggestionService.acceptSuggestion).not.toHaveBeenCalled();
  });
  it.each([
    { conditionType: 'MERCHANT_EQUALS' }, { conditionValue: 'Shop' },
    { conditionType: 'MERCHANT_EQUALS', conditionValue: '' },
    { conditionType: '', conditionValue: 'Shop' },
    { conditionType: 'UNKNOWN', conditionValue: 'Shop' },
  ])('rejects incomplete or invalid conditions %j rather than silently ignoring them', async patch => {
    const f = fixture();
    await expect(f.updateRule.handle({ ...ids, ...patch })).rejects.toBeInstanceOf(InvalidRuleConditionError);
    expect(f.ruleService.updateRule).not.toHaveBeenCalled();
  });
  it('allows an unrelated update without replacing the condition', async () => {
    const f = fixture(); await f.updateRule.handle({ ...ids, description: null });
    expect(f.ruleService.updateRule).toHaveBeenCalledWith(expect.objectContaining({ description: null, condition: undefined }));
  });
  it('rejects an explicitly empty category ID rather than treating it as omitted', async () => {
    const f = fixture(); await expect(f.updateRule.handle({ ...ids, targetCategoryId: '' })).rejects.toThrow();
    expect(f.ruleService.updateRule).not.toHaveBeenCalled();
  });
  it('rejects an unknown creation condition before calling the service', async () => {
    const f = fixture();
    await expect(f.createRule.handle({ ...ids, createdBy: ids.userId, name: 'Rule', conditionType: 'UNKNOWN', conditionValue: 'Shop', targetCategoryId: ids.categoryId })).rejects.toBeInstanceOf(InvalidRuleConditionError);
    expect(f.ruleService.createRule).not.toHaveBeenCalled();
  });
  it('rejects malformed actor input before issuing an authorization request', async () => {
    const f = fixture();
    await expect(new EvaluateRulesHandler(f.executionService, f.access, f.references).handle({ ...ids, userId: '', expenseData })).rejects.toThrow();
    expect(f.access.isAdminOrOwner).not.toHaveBeenCalled(); expect(f.executionService.evaluateAndApplyRules).not.toHaveBeenCalled();
  });
});
