export enum RuleConditionType {
  MERCHANT_CONTAINS = 'MERCHANT_CONTAINS',
  MERCHANT_EQUALS = 'MERCHANT_EQUALS',
  AMOUNT_GREATER_THAN = 'AMOUNT_GREATER_THAN',
  AMOUNT_LESS_THAN = 'AMOUNT_LESS_THAN',
  AMOUNT_EQUALS = 'AMOUNT_EQUALS',
  DESCRIPTION_CONTAINS = 'DESCRIPTION_CONTAINS',
  PAYMENT_METHOD_EQUALS = 'PAYMENT_METHOD_EQUALS',
}

export function isValidRuleConditionType(value: string): value is RuleConditionType {
  return Object.values(RuleConditionType).includes(value as RuleConditionType)
}
