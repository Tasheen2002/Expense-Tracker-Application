import { describe, it, expect } from 'vitest';
import { RuleId, RuleExecutionId, SuggestionId, ConfidenceScore, RuleCondition } from '../domain/value-objects';
import { RuleConditionType, isValidRuleConditionType } from '../domain/enums/rule-condition-type';
import { InvalidConfidenceScoreError, InvalidRuleConditionError } from '../domain/errors/categorization-rules.errors';
import { InvalidUuidError } from '@core/domain/value-objects/uuid-id.base';

describe('Categorization ID value objects', () => {
  const uuid = '123E4567-E89B-42D3-A456-426614174000';
  for (const type of [RuleId, RuleExecutionId, SuggestionId]) {
    describe(type.name, () => {
      it('creates unique UUIDs and round-trips normalized identifiers', () => {
        const id = type.create();
        expect(id.equals(type.fromString(id.getValue()))).toBe(true);
        expect(id.equals(type.create())).toBe(false);
        expect(type.fromString(uuid).getValue()).toBe(uuid.toLowerCase());
        expect(JSON.stringify(type.fromString(uuid))).toBe(JSON.stringify(uuid.toLowerCase()));
      });
      it.each(['', ' ', 'invalid', '00000000-0000-0000-0000-000000000000', '123e4567-e89b-42d3-a456-42661417400z', ` ${uuid}`])('rejects invalid ID %j', value => {
        expect(() => type.fromString(value)).toThrow(InvalidUuidError);
      });
      it('rejects cross-type equality and protects runtime state', () => {
        const id = type.fromString(uuid);
        const other = type === RuleId ? SuggestionId.fromString(uuid) : RuleId.fromString(uuid);
        expect(id.equals(other)).toBe(false);
        expect(id.equals(null)).toBe(false);
        expect(id.equals(undefined)).toBe(false);
        expect(Reflect.set(id, 'value', 'corrupted')).toBe(false);
        expect(id.getValue()).toBe(uuid.toLowerCase());
      });
    });
  }
});

describe('ConfidenceScore', () => {
  it.each(['0.5', null, undefined, true, {}])('rejects runtime nonnumeric confidence %j', value => {
    expect(() => Reflect.apply(ConfidenceScore.create, ConfidenceScore, [value])).toThrow(InvalidConfidenceScoreError);
  });
  it.each([NaN, Infinity, -Infinity, -0.01, 1.01])('rejects invalid confidence %s', value => {
    expect(() => ConfidenceScore.create(value)).toThrow(InvalidConfidenceScoreError);
  });
  it.each([[0, 'Low'], [0.499, 'Low'], [0.5, 'Medium'], [0.749, 'Medium'], [0.75, 'High'], [1, 'High']])('classifies boundary %s', (value, label) => {
    const score = ConfidenceScore.create(Number(value));
    expect(score.getLabel()).toBe(label);
    expect([score.isLow(), score.isMedium(), score.isHigh()].filter(Boolean)).toHaveLength(1);
  });
  it('uses exact, transitive equality rather than approximate similarity', () => {
    const a = ConfidenceScore.create(0.5), b = ConfidenceScore.create(0.5006), c = ConfidenceScore.create(0.5012);
    expect(a.equals(b)).toBe(false); expect(b.equals(c)).toBe(false);
    expect(a.equals(ConfidenceScore.create(0.5))).toBe(true);
    expect(a.equals(null)).toBe(false); expect(a.equals(undefined)).toBe(false);
  });
  it('preserves factory levels, display format and immutability', () => {
    expect(ConfidenceScore.low().isLow()).toBe(true);
    expect(ConfidenceScore.medium().isMedium()).toBe(true);
    expect(ConfidenceScore.high().isHigh()).toBe(true);
    const score = ConfidenceScore.high();
    expect(score.toString()).toBe('90.0%');
    expect(Reflect.set(score, 'value', -1)).toBe(false);
    expect(score.getValue()).toBe(0.9);
  });
});

describe('RuleCondition types and validation', () => {
  it('rejects unknown types and nonstring values with the domain error', () => {
    expect(() => Reflect.apply(RuleCondition.create, RuleCondition, ['UNKNOWN', 'shop'])).toThrow(InvalidRuleConditionError);
    for (const value of [null, undefined, 5, {}]) {
      expect(() => Reflect.apply(RuleCondition.create, RuleCondition, [RuleConditionType.MERCHANT_EQUALS, value])).toThrow(InvalidRuleConditionError);
    }
    const condition = RuleCondition.create(RuleConditionType.MERCHANT_EQUALS, 'shop');
    expect(() => Reflect.apply(condition.matches, condition, [{ amount: 1, merchant: 123 }])).toThrow(InvalidRuleConditionError);
  });
  it.each(Object.values(RuleConditionType))('recognizes supported condition %s', type => {
    expect(isValidRuleConditionType(type)).toBe(true);
  });
  it.each(['', 'merchant_contains', 'UNKNOWN', null, undefined, 1, {}])('rejects unknown enum input %j', input => {
    expect(isValidRuleConditionType(input)).toBe(false);
  });
  const numericTypes = [RuleConditionType.AMOUNT_EQUALS, RuleConditionType.AMOUNT_GREATER_THAN, RuleConditionType.AMOUNT_LESS_THAN];
  for (const type of numericTypes) {
    it.each(['10USD', '10.2.3', 'Infinity', 'NaN', '-1', '0x10', '1e3', '1e309', ' ', '1'.repeat(256)])(`${type} rejects malformed threshold %j`, value => {
      expect(() => RuleCondition.create(type, value)).toThrow(InvalidRuleConditionError);
    });
  }
  it.each(['0', '10', '10.50', '.5', '0001.00', '9'.repeat(255)])('accepts complete finite decimals and reconstitutes %s', value => {
    const condition = RuleCondition.create(RuleConditionType.AMOUNT_EQUALS, value);
    const copy = RuleCondition.create(condition.getConditionType(), condition.getConditionValue());
    expect(copy.equals(condition)).toBe(true);
  });
  it('trims boundary whitespace and compares according to matching semantics', () => {
    const condition = RuleCondition.create(RuleConditionType.MERCHANT_EQUALS, '  Shop  ');
    expect(condition.getConditionValue()).toBe('Shop');
    expect(condition.matches({ amount: 1, merchant: ' shop ' })).toBe(true);
    expect(condition.equals(RuleCondition.create(RuleConditionType.MERCHANT_EQUALS, 'SHOP'))).toBe(true);
    expect(RuleCondition.create(RuleConditionType.AMOUNT_EQUALS, '01.00').equals(RuleCondition.create(RuleConditionType.AMOUNT_EQUALS, '1'))).toBe(true);
    expect(condition.equals(RuleCondition.create(RuleConditionType.MERCHANT_CONTAINS, 'Shop'))).toBe(false);
    expect(condition.equals(null)).toBe(false); expect(condition.equals(undefined)).toBe(false);
    expect(Reflect.set(condition, 'conditionValue', '')).toBe(false);
  });
  it.each([NaN, Infinity, -Infinity, -1])('rejects invalid expense amount %s before matching', amount => {
    for (const type of numericTypes) {
      expect(() => RuleCondition.create(type, '1').matches({ amount })).toThrow(InvalidRuleConditionError);
    }
  });
  it.each([RuleConditionType.MERCHANT_CONTAINS, RuleConditionType.MERCHANT_EQUALS,
    RuleConditionType.DESCRIPTION_CONTAINS, RuleConditionType.PAYMENT_METHOD_EQUALS])('bounds text for %s and handles missing optional fields', type => {
    expect(() => RuleCondition.create(type, 'a'.repeat(256))).toThrow(InvalidRuleConditionError);
    const condition = RuleCondition.create(type, 'a'.repeat(255));
    expect(condition.matches({ amount: 0 })).toBe(false);
  });
});
