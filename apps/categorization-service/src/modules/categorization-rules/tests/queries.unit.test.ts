import { randomUUID } from 'node:crypto';
import { describe, it, expect, vi } from 'vitest';
import { WorkspaceId, UserId, ExpenseId } from '@core/domain/value-objects';
import { RuleId, SuggestionId } from '../domain/value-objects';
import { UnauthorizedCategorizationReadError } from '../domain/errors';
import {
  GetRuleByIdHandler, GetRulesByWorkspaceHandler, GetActiveRulesByWorkspaceHandler,
  GetExecutionsByRuleHandler, GetExecutionsByExpenseHandler, GetExecutionsByWorkspaceHandler,
  GetSuggestionByIdHandler, GetSuggestionsByExpenseHandler, GetSuggestionsByWorkspaceHandler, GetPendingSuggestionsByWorkspaceHandler,
} from '../application/queries';

const ids = { workspaceId: randomUUID(), userId: randomUUID(), ruleId: randomUUID(), suggestionId: randomUUID(), expenseId: randomUUID() };
const workspace = WorkspaceId.fromString(ids.workspaceId);
const options = { limit: 10, offset: 50 };
const query = { ...ids, ...options };
const page = { items: [], total: 75, ...options, hasMore: true };
function fixture() {
  const ruleDto = { id: ids.ruleId, workspaceId: ids.workspaceId, name: 'Rule', description: null,
    priority: 0, isActive: true, condition: { type: 'MERCHANT_EQUALS', value: 'Shop' }, targetCategoryId: randomUUID(),
    createdBy: ids.userId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const suggestionDto = { id: ids.suggestionId, workspaceId: ids.workspaceId, expenseId: ids.expenseId,
    suggestedCategoryId: randomUUID(), confidence: 0.9, reason: null, isAccepted: null, createdAt: new Date(), respondedAt: null };
  const rules = { getRuleById: vi.fn().mockResolvedValue(ruleDto), getRulesByWorkspaceId: vi.fn().mockResolvedValue(page), getActiveRulesByWorkspaceId: vi.fn().mockResolvedValue(page) };
  const executions = { getExecutionsByRuleId: vi.fn().mockResolvedValue(page), getExecutionsByExpenseId: vi.fn().mockResolvedValue(page), getExecutionsByWorkspaceId: vi.fn().mockResolvedValue(page) };
  const suggestions = { getSuggestionById: vi.fn().mockResolvedValue(suggestionDto), getSuggestionsByExpenseId: vi.fn().mockResolvedValue(page), getSuggestionsByWorkspaceId: vi.fn().mockResolvedValue(page), getPendingSuggestionsByWorkspaceId: vi.fn().mockResolvedValue(page) };
  const access = { isMember: vi.fn().mockResolvedValue(true), isAdminOrOwner: vi.fn() };
  const cases = [
    { name: 'rule by ID', spy: rules.getRuleById, run: () => new GetRuleByIdHandler(rules).handle(query), expected: ruleDto, args: [RuleId.fromString(ids.ruleId), ids.workspaceId, ids.userId], guarded: false },
    { name: 'workspace rules', spy: rules.getRulesByWorkspaceId, run: () => new GetRulesByWorkspaceHandler(rules).handle(query), expected: page, args: [workspace, ids.userId, options], guarded: false },
    { name: 'active rules', spy: rules.getActiveRulesByWorkspaceId, run: () => new GetActiveRulesByWorkspaceHandler(rules).handle(query), expected: page, args: [workspace, ids.userId, options], guarded: false },
    { name: 'executions by rule', spy: executions.getExecutionsByRuleId, run: () => new GetExecutionsByRuleHandler(executions, access).handle(query), expected: page, args: [RuleId.fromString(ids.ruleId), workspace, options], guarded: true },
    { name: 'executions by expense', spy: executions.getExecutionsByExpenseId, run: () => new GetExecutionsByExpenseHandler(executions, access).handle(query), expected: page, args: [ExpenseId.fromString(ids.expenseId), workspace, options], guarded: true },
    { name: 'workspace executions', spy: executions.getExecutionsByWorkspaceId, run: () => new GetExecutionsByWorkspaceHandler(executions, access).handle(query), expected: page, args: [workspace, options], guarded: true },
    { name: 'suggestion by ID', spy: suggestions.getSuggestionById, run: () => new GetSuggestionByIdHandler(suggestions, access).handle(query), expected: suggestionDto, args: [SuggestionId.fromString(ids.suggestionId), workspace], guarded: true },
    { name: 'suggestions by expense', spy: suggestions.getSuggestionsByExpenseId, run: () => new GetSuggestionsByExpenseHandler(suggestions, access).handle(query), expected: page, args: [ExpenseId.fromString(ids.expenseId), workspace, options], guarded: true },
    { name: 'workspace suggestions', spy: suggestions.getSuggestionsByWorkspaceId, run: () => new GetSuggestionsByWorkspaceHandler(suggestions, access).handle(query), expected: page, args: [workspace, options], guarded: true },
    { name: 'pending suggestions', spy: suggestions.getPendingSuggestionsByWorkspaceId, run: () => new GetPendingSuggestionsByWorkspaceHandler(suggestions, access).handle(query), expected: page, args: [workspace, options], guarded: true },
  ];
  return { cases, access, executions, suggestions };
}
describe('All ten query handlers', () => {
  const names = fixture().cases.map(test => test.name);
  it.each(names)('%s forwards workspace, identifiers, actor and pagination without discarding DTOs or metadata', async name => {
    const f = fixture(), test = f.cases.find(test => test.name === name)!;
    expect(await test.run()).toBe(test.expected);
    expect(test.spy).toHaveBeenCalledTimes(1); expect(test.spy).toHaveBeenCalledWith(...test.args);
    if (test.guarded) {
      expect(f.access.isMember).toHaveBeenCalledTimes(1);
      expect(f.access.isMember).toHaveBeenCalledWith(UserId.fromString(ids.userId), workspace);
      expect(f.access.isAdminOrOwner).not.toHaveBeenCalled();
    }
  });
  it.each(names)('%s preserves missing-record and dependency errors from the service', async name => {
    const test = fixture().cases.find(test => test.name === name)!;
    const failure = Object.assign(new Error('Record unavailable'), { statusCode: 404 });
    test.spy.mockRejectedValue(failure); await expect(test.run()).rejects.toBe(failure);
  });
  const guarded = fixture().cases.filter(test => test.guarded).map(test => test.name);
  it.each(guarded)('%s denies non-members before loading any data', async name => {
    const f = fixture(), test = f.cases.find(test => test.name === name)!;
    f.access.isMember.mockResolvedValue(false);
    await expect(test.run()).rejects.toBeInstanceOf(UnauthorizedCategorizationReadError);
    expect(test.spy).not.toHaveBeenCalled();
  });
  it.each(guarded)('%s fails closed when Identity is unavailable', async name => {
    const f = fixture(), test = f.cases.find(test => test.name === name)!;
    const failure = Object.assign(new Error('Identity unavailable'), { statusCode: 503 });
    f.access.isMember.mockRejectedValue(failure);
    await expect(test.run()).rejects.toBe(failure); expect(test.spy).not.toHaveBeenCalled();
  });
  it.each(['userId', 'workspaceId'] as const)('rejects invalid %s before checking membership or reading', async field => {
    const f = fixture();
    await expect(new GetSuggestionsByWorkspaceHandler(f.suggestions, f.access).handle({ ...query, [field]: '' })).rejects.toThrow();
    expect(f.access.isMember).not.toHaveBeenCalled(); expect(f.suggestions.getSuggestionsByWorkspaceId).not.toHaveBeenCalled();
  });
  it('preserves zero offset and omitted pagination for repository defaults', async () => {
    const f = fixture(), handler = new GetExecutionsByExpenseHandler(f.executions, f.access);
    await handler.handle({ ...ids, offset: 0 });
    expect(f.executions.getExecutionsByExpenseId).toHaveBeenCalledWith(ExpenseId.fromString(ids.expenseId), workspace, { limit: undefined, offset: 0 });
  });
});
