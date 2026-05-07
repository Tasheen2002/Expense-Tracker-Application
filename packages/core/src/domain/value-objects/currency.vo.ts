import { DomainError } from "../domain-error";
import {
  SUPPORTED_CURRENCIES,
  CRYPTO_CURRENCIES,
  CURRENCY_NAMES,
  CURRENCY_SYMBOLS,
  CURRENCY_REGIONS,
  DEFAULT_CURRENCY,
} from "./currency.constants";

class InvalidCurrencyError extends DomainError {
  constructor(message: string) {
    super(message, "INVALID_CURRENCY", 400);
  }
}

export class Currency {
  private constructor(private readonly value: string) {
    if (!value) throw new InvalidCurrencyError("Currency is required");
    if (!Currency.isValidCurrency(value)) {
      throw new InvalidCurrencyError(
        `Invalid currency code: ${value}. Must be a valid ISO 4217 code`,
      );
    }
  }

  static create(currency: string): Currency {
    return new Currency(currency.trim().toUpperCase());
  }

  static fromString(currency: string): Currency {
    return new Currency(currency);
  }

  static getDefaultCurrency(): Currency {
    return Currency.create(DEFAULT_CURRENCY);
  }

  static getAllSupportedCurrencies(): readonly string[] {
    return SUPPORTED_CURRENCIES;
  }

  static isValidCurrencyCode(currency: string): boolean {
    try {
      Currency.create(currency);
      return true;
    } catch {
      return false;
    }
  }

  private static isValidCurrency(currency: string): boolean {
    return (SUPPORTED_CURRENCIES as readonly string[]).includes(currency);
  }

  getValue(): string {
    return this.value;
  }

  getDisplayName(): string {
    return CURRENCY_NAMES[this.value] ?? this.value;
  }

  getSymbol(): string {
    return CURRENCY_SYMBOLS[this.value] ?? this.value;
  }

  getMajorCurrencyRegion(): string {
    return CURRENCY_REGIONS[this.value] ?? "Other";
  }

  isBaseCurrency(): boolean {
    return this.value === DEFAULT_CURRENCY;
  }

  isCrypto(): boolean {
    return (CRYPTO_CURRENCIES as readonly string[]).includes(this.value);
  }

  equals(other: Currency): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
