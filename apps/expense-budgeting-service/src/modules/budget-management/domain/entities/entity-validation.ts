import Decimal from 'decimal.js';
import { UuidId } from '@core/domain/value-objects/uuid-id.base';
import {
  BUDGET_NAME_MAX_LENGTH,
  BUDGET_DESCRIPTION_MAX_LENGTH,
  ALLOCATION_DESCRIPTION_MAX_LENGTH,
  MAX_BUDGET_AMOUNT,
  MAX_STORED_MONEY_AMOUNT,
  SUPPORTED_CURRENCIES,
} from '../constants/budget.constants';
import {
  InvalidAmountError,
  InvalidBudgetDataError,
  InvalidCurrencyError,
} from '../errors/budget.errors';

type MoneyInput = number | string | Decimal;

export function parseMoney(
  value: MoneyInput,
  label: string,
  options: { allowZero?: boolean; storageMaximum?: boolean; unbounded?: boolean } = {},
): Decimal {
  let amount: Decimal;
  try {
    amount = new Decimal(value);
  } catch {
    throw new InvalidAmountError(`${label} must be a valid monetary amount`);
  }

  const maximum = options.storageMaximum
    ? new Decimal(MAX_STORED_MONEY_AMOUNT)
    : new Decimal(MAX_BUDGET_AMOUNT);
  if (
    !amount.isFinite() ||
    amount.isNegative() ||
    (!options.allowZero && amount.isZero()) ||
    amount.decimalPlaces() > 2 ||
    (!options.unbounded && amount.greaterThan(maximum))
  ) {
    throw new InvalidAmountError(
      `${label} must be ${options.allowZero ? 'non-negative' : 'positive'}, have at most two decimal places${options.unbounded ? '' : `, and not exceed ${maximum.toString()}`}`,
    );
  }
  return amount;
}

export function normalizeCurrency(value: string): string {
  const currency = typeof value === 'string' ? value.toUpperCase() : '';
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw new InvalidCurrencyError('Unsupported currency');
  }
  return currency;
}

export function normalizeRequiredId(value: string, label: string): string {
  if (!UuidId.isValid(value)) {
    throw new InvalidBudgetDataError(`${label} must be a valid UUID`);
  }
  return value.toLowerCase();
}

export function normalizeOptionalId(
  value: string | undefined,
  label: string,
): string | null {
  return value === undefined ? null : normalizeRequiredId(value, label);
}

export function normalizeBudgetName(value: string): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name) {
    throw new InvalidBudgetDataError('Budget name is required');
  }
  if (name.length > BUDGET_NAME_MAX_LENGTH) {
    throw new InvalidBudgetDataError(
      `Budget name cannot exceed ${BUDGET_NAME_MAX_LENGTH} characters`,
    );
  }
  return name;
}

export function normalizeDescription(
  value: string | null | undefined,
  allocation = false,
): string | null {
  const description = value?.trim() || null;
  const maximum = allocation
    ? ALLOCATION_DESCRIPTION_MAX_LENGTH
    : BUDGET_DESCRIPTION_MAX_LENGTH;
  if (description && description.length > maximum) {
    throw new InvalidBudgetDataError(
      `Description cannot exceed ${maximum} characters`,
    );
  }
  return description;
}
