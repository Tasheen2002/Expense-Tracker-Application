import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { WorkspaceId, UserId, CategoryId, ExpenseId } from '@core/domain/value-objects';
import { CategoryRule, CategoryRuleUpdatedEvent } from '../domain/entities/category-rule.entity';
import { CategorySuggestion } from '../domain/entities/category-suggestion.entity';
import { RuleExecution } from '../domain/entities/rule-execution.entity';
import { RuleId, RuleExecutionId, SuggestionId, RuleCondition, ConfidenceScore } from '../domain/value-objects';
import { RuleConditionType } from '../domain/enums';
import * as errors from '../domain/errors';

const workspaceId = WorkspaceId.fromString(randomUUID());
const ruleInput = () => ({ workspaceId, name: 'Shop rule', description: 'Description', priority: 1,
  condition: RuleCondition.create(RuleConditionType.MERCHANT_CONTAINS, 'shop'),
  targetCategoryId: CategoryId.fromString(randomUUID()), createdBy: UserId.fromString(randomUUID()) });
const suggestionInput = () => ({ expenseOwnerId: UserId.fromString(randomUUID()), workspaceId, expenseId: ExpenseId.fromString(randomUUID()),
  suggestedCategoryId: CategoryId.fromString(randomUUID()), confidence: ConfidenceScore.high(), reason: 'Reason' });
const ruleSnapshot = () => ({ ...ruleInput(), id: RuleId.create(), description: null, isActive: true,
  createdAt: new Date(1000), updatedAt: new Date(2000) });
const suggestionSnapshot = () => ({ ...suggestionInput(), id: SuggestionId.create(), reason: null,
  isAccepted: null, createdAt: new Date(1000), respondedAt: null });

describe('CategoryRule invariants', () => {
  it('records the verified expense creator in the immutable suggestion-created event', () => {
    const input = suggestionInput(); const suggestion = CategorySuggestion.create(input);
    expect(suggestion.domainEvents[0].getPayload()).toMatchObject({ expenseOwnerId: input.expenseOwnerId.getValue(),
      expenseId: input.expenseId.getValue(), workspaceId: input.workspaceId.getValue() });
    expect(Object.isFrozen(suggestion.domainEvents[0])).toBe(true);
    expect(() => Reflect.apply(CategorySuggestion.create, CategorySuggestion, [{ ...input, expenseOwnerId: undefined }]))
      .toThrow(errors.InvalidSuggestionError);
  });
  it('rejects a deletion timestamp later than the last update', () => {
    expect(() => CategoryRule.fromPersistence({ ...ruleSnapshot(), isActive: false, deletedAt: new Date(3000) })).toThrow(errors.InvalidRuleError);
  });
  it.each([NaN, Infinity, -Infinity, -1, 0.5, 2147483648])('rejects invalid priority %s on creation, update and reconstruction', priority => {
    expect(() => CategoryRule.create({ ...ruleInput(), priority })).toThrow(errors.InvalidRuleError);
    expect(() => CategoryRule.fromPersistence({ ...ruleSnapshot(), priority })).toThrow(errors.InvalidRuleError);
    const rule = CategoryRule.create(ruleInput()); rule.clearDomainEvents();
    expect(() => rule.updatePriority(priority)).toThrow(errors.InvalidRuleError);
    expect(rule.priority).toBe(1); expect(rule.domainEvents).toHaveLength(0);
  });
  it.each(['', '   ', 'x'.repeat(101)])('rejects invalid name %j', name => {
    expect(() => CategoryRule.create({ ...ruleInput(), name })).toThrow(errors.InvalidRuleError);
    expect(() => CategoryRule.fromPersistence({ ...ruleSnapshot(), name })).toThrow(errors.InvalidRuleError);
  });
  it('validates multi-field updates before applying any state', () => {
    const rule = CategoryRule.create(ruleInput()); rule.clearDomainEvents();
    const before = CategoryRule.toDTO(rule);
    expect(() => rule.updateDetails({ name: 'New name', description: 'x'.repeat(501) })).toThrow(errors.InvalidRuleError);
    expect(CategoryRule.toDTO(rule)).toEqual(before);
    expect(rule.domainEvents).toHaveLength(0);
  });
  it('does not emit events or touch timestamps for unchanged inputs', () => {
    const rule = CategoryRule.create(ruleInput()); rule.clearDomainEvents();
    const before = rule.updatedAt;
    rule.updateDetails({}); rule.updateName(' Shop rule '); rule.updateDescription('Description');
    rule.updatePriority(1); rule.updateCondition(RuleCondition.create(RuleConditionType.MERCHANT_CONTAINS, 'SHOP'));
    rule.updateTargetCategory(rule.targetCategoryId); rule.activate();
    expect(rule.updatedAt).toEqual(before); expect(rule.domainEvents).toHaveLength(0);
  });
  it('makes activation, deactivation and deletion idempotent and deletion terminal', () => {
    const rule = CategoryRule.create(ruleInput()); rule.clearDomainEvents();
    rule.deactivate(); rule.deactivate(); rule.activate(); rule.activate(); rule.markAsDeleted(); rule.markAsDeleted();
    expect(rule.domainEvents.map(event => event.eventType)).toEqual(['CategoryRuleDeactivated', 'CategoryRuleActivated', 'CategoryRuleDeleted']);
    expect(rule.isActive).toBe(false); expect(rule.deletedAt).not.toBeNull();
    expect(rule.matches({ merchant: 'shop', amount: 1 })).toBe(false);
    expect(() => rule.activate()).toThrow(errors.InvalidRuleError);
    expect(() => rule.updateName('Change')).toThrow(errors.InvalidRuleError);
    expect(() => rule.recordExecution(randomUUID(), randomUUID(), true)).toThrow(errors.InvalidRuleError);
  });
  it('clones caller props and timestamps on reconstruction and getters', () => {
    const props = ruleSnapshot(); const rule = CategoryRule.fromPersistence(props);
    props.name = 'Mutated'; props.createdAt.setTime(0); props.updatedAt.setTime(0);
    rule.createdAt.setTime(0); rule.updatedAt.setTime(0);
    expect(rule.name).toBe('Shop rule'); expect(rule.createdAt.getTime()).toBe(1000); expect(rule.updatedAt.getTime()).toBe(2000);
    rule.markAsDeleted(); const deletedAt = rule.deletedAt!; deletedAt.setTime(0);
    expect(rule.deletedAt!.getTime()).not.toBe(0);
  });
  it('rejects invalid reconstructed dates and deleted/active state', () => {
    expect(() => CategoryRule.fromPersistence({ ...ruleSnapshot(), createdAt: new Date(NaN) })).toThrow(errors.InvalidRuleError);
    expect(() => CategoryRule.fromPersistence({ ...ruleSnapshot(), updatedAt: new Date(0) })).toThrow(errors.InvalidRuleError);
    expect(() => CategoryRule.fromPersistence({ ...ruleSnapshot(), deletedAt: new Date(2000) })).toThrow(errors.InvalidRuleError);
  });
  it('emits workspace-scoped events and protects update payload arrays', () => {
    const rule = CategoryRule.create(ruleInput()); rule.updateDetails({ name: 'Changed', priority: 2 });
    rule.deactivate(); rule.activate(); rule.recordExecution(randomUUID(), randomUUID(), true); rule.markAsDeleted();
    for (const event of rule.domainEvents) expect(event.getPayload().workspaceId).toBe(workspaceId.getValue());
    const update = rule.domainEvents.find(event => event.eventType === 'CategoryRuleUpdated')!;
    const eventCount = rule.domainEvents.length;
    rule.domainEvents.splice(0);
    expect(rule.domainEvents).toHaveLength(eventCount);
    (update.getPayload().updatedFields as string[]).push('corrupted');
    expect(update.getPayload().updatedFields).toEqual(['name', 'priority']);
    const restored = CategoryRule.fromPersistence(ruleSnapshot());
    expect(restored.domainEvents).toHaveLength(0);
  });
  it('rejects invalid execution IDs and inactive execution recording', () => {
    const rule = CategoryRule.create(ruleInput()); rule.clearDomainEvents();
    expect(() => rule.recordExecution('invalid', randomUUID(), true)).toThrow();
    expect(() => rule.recordExecution(randomUUID(), 'invalid', true)).toThrow();
    rule.deactivate();
    expect(() => rule.recordExecution(randomUUID(), randomUUID(), true)).toThrow(errors.InvalidRuleError);
  });
});

describe('CategorySuggestion invariants', () => {
  it.each([0, -1, 1.5, NaN, Infinity, 2147483648])('rejects invalid expense versions %s before recording acceptance', version => {
    const suggestion = CategorySuggestion.create(suggestionInput()); suggestion.clearDomainEvents();
    expect(() => suggestion.accept(randomUUID(), version)).toThrow(errors.InvalidSuggestionError);
    expect(suggestion.isPending()).toBe(true); expect(suggestion.domainEvents).toHaveLength(0);
  });
  it.each([123, true, {}, []])('rejects malformed reason %j with a domain error instead of a trim TypeError', reason => {
    expect(() => Reflect.apply(CategorySuggestion.create, CategorySuggestion, [{ ...suggestionInput(), reason }])).toThrow(errors.InvalidSuggestionError);
  });
  it.each(['accept', 'reject'] as const)('allows %s once and uses a conflict error for subsequent responses', operation => {
    const suggestion = CategorySuggestion.create(suggestionInput()); suggestion.clearDomainEvents();
    if (operation === 'accept') suggestion.accept(randomUUID(), 1); else suggestion.reject();
    const responseDate = suggestion.respondedAt;
    expect(suggestion.isPending()).toBe(false);
    expect(suggestion.wasAccepted()).toBe(operation === 'accept');
    expect(suggestion.wasRejected()).toBe(operation === 'reject');
    expect(() => suggestion.accept(randomUUID(), 1)).toThrow(errors.SuggestionAlreadyRespondedError);
    expect(() => suggestion.reject()).toThrow(errors.SuggestionAlreadyRespondedError);
    expect(suggestion.respondedAt).toEqual(responseDate); expect(suggestion.domainEvents).toHaveLength(1);
    expect(suggestion.domainEvents[0].getPayload().workspaceId).toBe(workspaceId.getValue());
  });
  it('makes deletion idempotent and prevents subsequent response events', () => {
    const suggestion = CategorySuggestion.create(suggestionInput()); suggestion.clearDomainEvents();
    suggestion.markAsDeleted(); suggestion.markAsDeleted();
    expect(suggestion.domainEvents).toHaveLength(1);
    expect(suggestion.domainEvents[0].getPayload().workspaceId).toBe(workspaceId.getValue());
    expect(() => suggestion.accept(randomUUID(), 1)).toThrow(errors.InvalidSuggestionError);
    expect(() => suggestion.reject()).toThrow(errors.InvalidSuggestionError);
  });
  it('rejects inconsistent response state and timestamps during reconstruction', () => {
    expect(() => CategorySuggestion.fromPersistence({ ...suggestionSnapshot(), isAccepted: true })).toThrow(errors.InvalidSuggestionError);
    expect(() => CategorySuggestion.fromPersistence({ ...suggestionSnapshot(), respondedAt: new Date(2000) })).toThrow(errors.InvalidSuggestionError);
    expect(() => CategorySuggestion.fromPersistence({ ...suggestionSnapshot(), isAccepted: false, respondedAt: new Date(0) })).toThrow(errors.InvalidSuggestionError);
    expect(() => CategorySuggestion.fromPersistence({ ...suggestionSnapshot(), createdAt: new Date(NaN) })).toThrow(errors.InvalidSuggestionError);
    expect(() => CategorySuggestion.create({ ...suggestionInput(), reason: 'x'.repeat(501) })).toThrow(errors.InvalidSuggestionError);
  });
  it('protects reconstructed props, getters and DTO dates', () => {
    const props: Parameters<typeof CategorySuggestion.fromPersistence>[0] = { ...suggestionSnapshot(), isAccepted: true, respondedAt: new Date(2000) };
    const suggestion = CategorySuggestion.fromPersistence(props);
    props.createdAt.setTime(0); props.respondedAt!.setTime(0); props.reason = 'Changed';
    suggestion.createdAt.setTime(0); suggestion.respondedAt!.setTime(0);
    const dto = CategorySuggestion.toDTO(suggestion); dto.createdAt.setTime(0); dto.respondedAt!.setTime(0);
    expect(suggestion.createdAt.getTime()).toBe(1000); expect(suggestion.respondedAt!.getTime()).toBe(2000);
    expect(suggestion.reason).toBeNull(); expect(suggestion.domainEvents).toHaveLength(0);
  });
});

describe('RuleExecution history', () => {
  it('preserves caller-independent state across reconstruction, getters and DTOs', () => {
    const props = { id: RuleExecutionId.create(), ruleId: RuleId.create(), workspaceId,
      expenseId: ExpenseId.fromString(randomUUID()), appliedCategoryId: CategoryId.fromString(randomUUID()), executedAt: new Date(1000) };
    const execution = RuleExecution.fromPersistence(props);
    props.executedAt.setTime(0); const expense = execution.expenseId; props.expenseId = ExpenseId.fromString(randomUUID());
    execution.executedAt.setTime(0); RuleExecution.toDTO(execution).executedAt.setTime(0);
    expect(execution.executedAt.getTime()).toBe(1000); expect(execution.expenseId.equals(expense)).toBe(true);
    expect(() => RuleExecution.fromPersistence({ ...props, executedAt: new Date(NaN) })).toThrow(errors.InvalidRuleExecutionError);
  });
});

describe('Domain error contracts', () => {
  it('preserves distinct actionable codes and statuses for failures used by these entities', () => {
    const instances = [new errors.InvalidRuleError('invalid'), new errors.InvalidSuggestionError('invalid'),
      new errors.InvalidRuleExecutionError('invalid'), new errors.SuggestionAlreadyRespondedError('id'),
      new errors.DuplicateRuleNameError('name'), new errors.SuggestionNotFoundError('id')];
    expect(new Set(instances.map(error => error.code)).size).toBe(instances.length);
    expect(instances.map(error => error.statusCode)).toEqual([400, 400, 400, 409, 409, 404]);
    for (const error of instances) expect(error).toBeInstanceOf(errors.CategorizationRuleDomainError);
  });
});

describe('Categorization event immutability', () => {
  it('protects every event type, including its timestamp, without freezing the aggregate', () => {
    const rule = CategoryRule.create(ruleInput());
    rule.updateName('Changed'); rule.deactivate(); rule.activate();
    rule.recordExecution(randomUUID(), randomUUID(), true); rule.markAsDeleted();
    const accepted = CategorySuggestion.create(suggestionInput()); accepted.accept(randomUUID(), 1); accepted.markAsDeleted();
    const rejected = CategorySuggestion.create(suggestionInput()); rejected.reject();
    const events = [...rule.domainEvents, ...accepted.domainEvents, ...rejected.domainEvents];
    expect(new Set(events.map(event => event.eventType)).size).toBe(10);
    for (const event of events) {
      const before = event.toJSON();
      expect(Object.isFrozen(event)).toBe(true);
      event.occurredAt.setTime(0);
      expect(Reflect.set(event, 'aggregateId', 'corrupted')).toBe(false);
      expect(Reflect.set(event, 'workspaceId', 'corrupted')).toBe(false);
      expect(Reflect.set(event, 'occurredAt', new Date(0))).toBe(false);
      expect(event.toJSON()).toEqual(before);
    }
    // Persistence must still be able to clear pending events after commit.
    rule.clearDomainEvents(); accepted.clearDomainEvents();
    expect(rule.domainEvents).toHaveLength(0); expect(accepted.domainEvents).toHaveLength(0);
  });
  it('copies and freezes the supplied update fields and returns independent payloads', () => {
    const fields = ['name'];
    const event = new CategoryRuleUpdatedEvent(randomUUID(), fields, workspaceId.getValue());
    fields.push('corrupted');
    expect(event.updatedFields).toEqual(['name']);
    expect(() => Reflect.apply(Array.prototype.push, event.updatedFields, ['corrupted'])).toThrow(TypeError);
    (event.getPayload().updatedFields as string[]).push('corrupted');
    expect(event.getPayload().updatedFields).toEqual(['name']);
  });
});
