import { RuleConditionType, isValidRuleConditionType } from "../enums/rule-condition-type";
import { InvalidRuleConditionError } from "../errors/categorization-rules.errors";

export class RuleCondition {
  private constructor(
    private readonly conditionType: RuleConditionType,
    private readonly conditionValue: string,
  ) {
    if (!isValidRuleConditionType(conditionType)) {
      throw new InvalidRuleConditionError(`Unknown condition type: ${conditionType}`);
    }
    if (typeof conditionValue !== 'string' || conditionValue.trim() === "") {
      throw new InvalidRuleConditionError("Condition value cannot be empty");
    }

    this.conditionValue = conditionValue.trim();
    if (this.conditionValue.length > 255) {
      throw new InvalidRuleConditionError('Condition value cannot exceed 255 characters');
    }
    this.validateConditionValue(conditionType, this.conditionValue);
    Object.freeze(this);
  }

  static create(
    conditionType: RuleConditionType,
    conditionValue: string,
  ): RuleCondition {
    return new RuleCondition(conditionType, conditionValue);
  }

  private validateConditionValue(type: RuleConditionType, value: string): void {
    switch (type) {
      case RuleConditionType.AMOUNT_GREATER_THAN:
      case RuleConditionType.AMOUNT_LESS_THAN:
      case RuleConditionType.AMOUNT_EQUALS:
        if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value) || !Number.isFinite(Number(value))) {
          throw new InvalidRuleConditionError(
            "Amount condition value must be a finite non-negative decimal number",
          );
        }
        break;

      case RuleConditionType.MERCHANT_CONTAINS:
      case RuleConditionType.MERCHANT_EQUALS:
      case RuleConditionType.DESCRIPTION_CONTAINS:
      case RuleConditionType.PAYMENT_METHOD_EQUALS:
        if (value.length > 255) {
          throw new InvalidRuleConditionError(
            "Condition value cannot exceed 255 characters",
          );
        }
        break;

      default:
        throw new InvalidRuleConditionError(`Unknown condition type: ${type}`);
    }
  }

  getConditionType(): RuleConditionType {
    return this.conditionType;
  }

  private isAmountCondition(): boolean {
    return this.conditionType === RuleConditionType.AMOUNT_GREATER_THAN ||
      this.conditionType === RuleConditionType.AMOUNT_LESS_THAN ||
      this.conditionType === RuleConditionType.AMOUNT_EQUALS;
  }

  getConditionValue(): string {
    return this.conditionValue;
  }

  matches(expenseData: {
    merchant?: string;
    description?: string;
    amount: number;
    paymentMethod?: string;
  }): boolean {
    RuleCondition.validateExpenseData(expenseData);
    return this.matchesValidated(expenseData);
  }

  static validateExpenseData(expenseData: {
    merchant?: string;
    description?: string;
    amount: number;
    paymentMethod?: string;
  }): void {
    if (!expenseData || !Number.isFinite(expenseData.amount) || expenseData.amount < 0 ||
        [expenseData.merchant, expenseData.description, expenseData.paymentMethod]
          .some(value => value !== undefined && typeof value !== 'string')) {
      throw new InvalidRuleConditionError('Expense matching data must contain a finite non-negative amount and valid text fields');
    }
  }

  private matchesValidated(expenseData: {
    merchant?: string;
    description?: string;
    amount: number;
    paymentMethod?: string;
  }): boolean {
    switch (this.conditionType) {
      case RuleConditionType.MERCHANT_CONTAINS:
        return (
          expenseData.merchant
            ?.toLowerCase()
            .includes(this.conditionValue.toLowerCase()) || false
        );

      case RuleConditionType.MERCHANT_EQUALS:
        return (
          expenseData.merchant?.trim().toLowerCase() ===
          this.conditionValue.toLowerCase()
        );

      case RuleConditionType.DESCRIPTION_CONTAINS:
        return (
          expenseData.description
            ?.toLowerCase()
            .includes(this.conditionValue.toLowerCase()) || false
        );

      case RuleConditionType.AMOUNT_GREATER_THAN:
        return expenseData.amount > Number(this.conditionValue);

      case RuleConditionType.AMOUNT_LESS_THAN:
        return expenseData.amount < Number(this.conditionValue);

      case RuleConditionType.AMOUNT_EQUALS:
        return expenseData.amount === Number(this.conditionValue);

      case RuleConditionType.PAYMENT_METHOD_EQUALS:
        return (
          expenseData.paymentMethod?.trim().toLowerCase() ===
          this.conditionValue.toLowerCase()
        );

      default:
        return false;
    }
  }

  equals(other: RuleCondition | null | undefined): boolean {
    return (
      other instanceof RuleCondition &&
      this.conditionType === other.conditionType &&
      (this.isAmountCondition()
        ? Number(this.conditionValue) === Number(other.conditionValue)
        : this.conditionValue.toLowerCase() === other.conditionValue.toLowerCase())
    );
  }

  toString(): string {
    return `${this.conditionType}: ${this.conditionValue}`;
  }
}
