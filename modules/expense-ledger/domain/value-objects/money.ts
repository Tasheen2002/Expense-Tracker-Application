import { Decimal } from "@prisma/client/runtime/library";
import {
  InvalidFormatError,
  ValueOutOfRangeError,
  CurrencyMismatchError,
} from "../../../../apps/api/src/shared/domain/errors";

export class Money {
  private readonly amount: Decimal;
  private readonly currency: string;

  private constructor(amount: Decimal, currency: string) {
    this.amount = amount;
    this.currency = currency;
  }

  static create(amount: number | string | Decimal, currency: string): Money {
    if (!this.isValidCurrency(currency)) {
      throw new InvalidFormatError("currency", "ISO 4217 currency code");
    }

    const decimalAmount =
      typeof amount === "number" || typeof amount === "string"
        ? new Decimal(amount)
        : amount;

    if (decimalAmount.isNegative()) {
      throw new ValueOutOfRangeError("amount", "Amount cannot be negative");
    }

    if (decimalAmount.decimalPlaces() > 2) {
      throw new ValueOutOfRangeError(
        "amount",
        "Amount cannot have more than 2 decimal places",
      );
    }

    return new Money(decimalAmount, currency.toUpperCase());
  }

  static isValidCurrency(currency: string): boolean {
    // ISO 4217 currency codes validation (common currencies)
    const validCurrencies = [
      "USD",
      "EUR",
      "GBP",
      "JPY",
      "CNY",
      "AUD",
      "CAD",
      "CHF",
      "INR",
      "MXN",
      "BRL",
      "ZAR",
      "RUB",
      "KRW",
      "SGD",
      "NZD",
      "TRY",
      "HKD",
      "NOK",
      "SEK",
      "DKK",
      "PLN",
      "THB",
      "IDR",
      "HUF",
      "CZK",
      "ILS",
      "CLP",
      "PHP",
      "AED",
      "SAR",
      "MYR",
      "RON",
      "ARS",
      "VND",
      "PKR",
      "BDT",
      "EGP",
      "NGN",
      "KES",
    ];
    return validCurrencies.includes(currency.toUpperCase());
  }

  getAmount(): Decimal {
    return this.amount;
  }

  getCurrency(): string {
    return this.currency;
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError("add");
    }
    return new Money(this.amount.add(other.amount), this.currency);
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError("subtract");
    }
    const result = this.amount.sub(other.amount);
    if (result.isNegative()) {
      throw new ValueOutOfRangeError(
        "result",
        "Subtraction result cannot be negative",
      );
    }
    return new Money(result, this.currency);
  }

  multiply(factor: number): Money {
    return new Money(this.amount.mul(factor), this.currency);
  }

  equals(other: Money): boolean {
    return this.amount.equals(other.amount) && this.currency === other.currency;
  }

  isGreaterThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError("compare");
    }
    return this.amount.greaterThan(other.amount);
  }

  isLessThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError("compare");
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
