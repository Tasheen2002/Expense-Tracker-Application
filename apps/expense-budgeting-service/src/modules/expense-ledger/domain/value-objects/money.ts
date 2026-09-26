import { Decimal } from 'decimal.js';
import {
  InvalidFormatError,
  ValueOutOfRangeError,
  CurrencyMismatchError,
} from '@shared/domain/errors/domain-validation.errors';

/** ISO 4217 currency codes supported by the expense ledger module. */
export const VALID_CURRENCIES: readonly string[] = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CNY',
  'AUD',
  'CAD',
  'CHF',
  'INR',
  'MXN',
  'BRL',
  'ZAR',
  'RUB',
  'KRW',
  'SGD',
  'NZD',
  'TRY',
  'HKD',
  'NOK',
  'SEK',
  'DKK',
  'PLN',
  'THB',
  'IDR',
  'HUF',
  'CZK',
  'ILS',
  'CLP',
  'PHP',
  'AED',
  'SAR',
  'MYR',
  'RON',
  'ARS',
  'VND',
  'PKR',
  'BDT',
  'EGP',
  'NGN',
  'KES',
];

export class Money {
  private readonly amount: Decimal;
  private readonly currency: string;

  private constructor(amount: Decimal, currency: string) {
    this.amount = amount;
    this.currency = currency;
  }

  static create(amount: number | string | Decimal, currency: string): Money {
    if (!this.isValidCurrency(currency)) {
      throw new InvalidFormatError('currency', 'ISO 4217 currency code');
    }

    const decimalAmount =
      typeof amount === 'number' || typeof amount === 'string'
        ? new Decimal(amount)
        : amount;

    if (decimalAmount.isNaN() || !decimalAmount.isFinite()) {
      throw new ValueOutOfRangeError('amount', 'Amount must be a finite number');
    }

    if (decimalAmount.isNegative()) {
      throw new ValueOutOfRangeError('amount', 'Amount cannot be negative');
    }

    if (decimalAmount.decimalPlaces() > 2) {
      throw new ValueOutOfRangeError(
        'amount',
        'Amount cannot have more than 2 decimal places'
      );
    }

    return new Money(decimalAmount, currency.toUpperCase());
  }

  static isValidCurrency(currency: string): boolean {
    return VALID_CURRENCIES.includes(currency.toUpperCase());
  }

  getAmount(): Decimal {
    return this.amount;
  }

  toNumber(): number {
    return this.amount.toNumber();
  }

  getCurrency(): string {
    return this.currency;
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError('add');
    }
    return new Money(this.amount.add(other.amount), this.currency);
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError('subtract');
    }
    const result = this.amount.sub(other.amount);
    if (result.isNegative()) {
      throw new ValueOutOfRangeError(
        'result',
        'Subtraction result cannot be negative'
      );
    }
    return new Money(result, this.currency);
  }

  multiply(factor: number): Money {
    if (typeof factor !== 'number' || !Number.isFinite(factor)) {
      throw new ValueOutOfRangeError('factor', 'Factor must be a finite number');
    }
    const result = this.amount.mul(factor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    return Money.create(result, this.currency);
  }

  divide(divisor: number): Money {
    if (typeof divisor !== 'number' || !Number.isFinite(divisor) || divisor === 0) {
      throw new ValueOutOfRangeError('divisor', 'Cannot divide by zero or non-finite number');
    }
    const result = this.amount.div(divisor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    return Money.create(result, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount.equals(other.amount) && this.currency === other.currency;
  }

  isGreaterThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError('compare');
    }
    return this.amount.greaterThan(other.amount);
  }

  isLessThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError('compare');
    }
    return this.amount.lessThan(other.amount);
  }

  toString(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }

  toJSON() {
    return {
      amount: this.amount.toString(),
      currency: this.currency,
    };
  }
}
