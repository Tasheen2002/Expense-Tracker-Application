import { RuleConditionType } from '../enums/rule-condition-type'

export class RuleCondition {
  private constructor(
    private readonly conditionType: RuleConditionType,
    private readonly conditionValue: string
  ) {
    if (!conditionValue || conditionValue.trim() === '') {
      throw new Error('Condition value cannot be empty')
    }

    // Validate based on condition type
    this.validateConditionValue(conditionType, conditionValue)
  }

  static create(
    conditionType: RuleConditionType,
    conditionValue: string
  ): RuleCondition {
    return new RuleCondition(conditionType, conditionValue)
  }

  private validateConditionValue(
    type: RuleConditionType,
    value: string
  ): void {
    switch (type) {
      case RuleConditionType.AMOUNT_GREATER_THAN:
      case RuleConditionType.AMOUNT_LESS_THAN:
      case RuleConditionType.AMOUNT_EQUALS:
        const numValue = parseFloat(value)
        if (isNaN(numValue) || numValue < 0) {
          throw new Error('Amount condition value must be a non-negative number')
        }
        break

      case RuleConditionType.MERCHANT_CONTAINS:
      case RuleConditionType.MERCHANT_EQUALS:
      case RuleConditionType.DESCRIPTION_CONTAINS:
      case RuleConditionType.PAYMENT_METHOD_EQUALS:
        if (value.length > 255) {
          throw new Error('Condition value cannot exceed 255 characters')
        }
        break

      default:
        throw new Error(`Unknown condition type: ${type}`)
    }
  }

  getConditionType(): RuleConditionType {
    return this.conditionType
  }

  getConditionValue(): string {
    return this.conditionValue
  }

  // Alias methods for consistency
  getType(): RuleConditionType {
    return this.conditionType
  }

  getValue(): string {
    return this.conditionValue
  }

  matches(expenseData: {
    merchant?: string
    description?: string
    amount: number
    paymentMethod?: string
  }): boolean {
    switch (this.conditionType) {
      case RuleConditionType.MERCHANT_CONTAINS:
        return (
          expenseData.merchant
            ?.toLowerCase()
            .includes(this.conditionValue.toLowerCase()) || false
        )

      case RuleConditionType.MERCHANT_EQUALS:
        return (
          expenseData.merchant?.toLowerCase() ===
          this.conditionValue.toLowerCase()
        )

      case RuleConditionType.DESCRIPTION_CONTAINS:
        return (
          expenseData.description
            ?.toLowerCase()
            .includes(this.conditionValue.toLowerCase()) || false
        )

      case RuleConditionType.AMOUNT_GREATER_THAN:
        return expenseData.amount > parseFloat(this.conditionValue)

      case RuleConditionType.AMOUNT_LESS_THAN:
        return expenseData.amount < parseFloat(this.conditionValue)

      case RuleConditionType.AMOUNT_EQUALS:
        return expenseData.amount === parseFloat(this.conditionValue)

      case RuleConditionType.PAYMENT_METHOD_EQUALS:
        return (
          expenseData.paymentMethod?.toLowerCase() ===
          this.conditionValue.toLowerCase()
        )

      default:
        return false
    }
  }

  equals(other: RuleCondition): boolean {
    return (
      this.conditionType === other.conditionType &&
      this.conditionValue === other.conditionValue
    )
  }

  toString(): string {
    return `${this.conditionType}: ${this.conditionValue}`
  }
}
