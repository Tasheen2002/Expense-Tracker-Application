import { InvalidAmountRangeError } from '../errors';
import { MIN_APPROVAL_AMOUNT, MAX_APPROVAL_AMOUNT } from '../constants';

/**
 * ApprovalAmount Value Object
 *
 * Encapsulates monetary amounts within the approval workflow domain:
 * - Guarantees non-negative, finite numbers.
 * - Enforces upper domain bounds [MIN_APPROVAL_AMOUNT, MAX_APPROVAL_AMOUNT].
 * - Quantizes and prevents floating-point precision issues to 2 decimal places.
 * - Protects domain boundary against NaN, Infinity, and invalid primitives.
 */
export class ApprovalAmount {
  private readonly value: number;

  private constructor(value: number) {
    if (typeof value !== 'number' || !Number.isFinite(value) || Number.isNaN(value)) {
      throw new InvalidAmountRangeError('Approval amount must be a finite number');
    }

    if (value < MIN_APPROVAL_AMOUNT || value > MAX_APPROVAL_AMOUNT) {
      throw new InvalidAmountRangeError(
        `Approval amount must be between ${MIN_APPROVAL_AMOUNT} and ${MAX_APPROVAL_AMOUNT}`
      );
    }

    this.value = Math.round(value * 100) / 100;
  }

  static fromNumber(value: number): ApprovalAmount {
    return new ApprovalAmount(value);
  }

  static create(value: number): ApprovalAmount {
    return new ApprovalAmount(value);
  }

  getValue(): number {
    return this.value;
  }

  isLessThan(other: ApprovalAmount | number): boolean {
    const compareValue =
      typeof other === 'number'
        ? ApprovalAmount.fromNumber(other).getValue()
        : other.getValue();
    return this.value < compareValue;
  }

  isGreaterThan(other: ApprovalAmount | number): boolean {
    const compareValue =
      typeof other === 'number'
        ? ApprovalAmount.fromNumber(other).getValue()
        : other.getValue();
    return this.value > compareValue;
  }

  equals(other: ApprovalAmount | null | undefined): boolean {
    if (!other) return false;
    return this.value === other.value;
  }

  toJSON(): number {
    return this.value;
  }

  toString(): string {
    return this.value.toFixed(2);
  }
}
