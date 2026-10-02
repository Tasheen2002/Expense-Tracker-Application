/**
 * Budget Management Module Constants
 */

// Budget validation constants
export const BUDGET_NAME_MIN_LENGTH = 1
export const BUDGET_NAME_MAX_LENGTH = 255
export const BUDGET_DESCRIPTION_MAX_LENGTH = 5000

// Amount validation
export const MIN_BUDGET_AMOUNT = 0.01
export const MAX_BUDGET_AMOUNT = 999999999.99
// Maximum positive value representable by the budget tables' Decimal(12, 2) columns.
export const MAX_STORED_MONEY_AMOUNT = '9999999999.99'

// Allocation validation
export const MIN_ALLOCATION_AMOUNT = 0.01
export const ALLOCATION_DESCRIPTION_MAX_LENGTH = 500

// Alert threshold validation
export const DEFAULT_ALERT_THRESHOLDS = Object.freeze({
  INFO: 50,
  WARNING: 75,
  CRITICAL: 90,
  EXCEEDED: 100,
});

// Currency validation
export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AUD', 'CAD', 'CHF', 'SEK',
  'NZD', 'SGD', 'HKD', 'NOK', 'KRW', 'TRY', 'RUB', 'BRL', 'ZAR', 'MXN'
]

export const DEFAULT_CURRENCY = 'USD'

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100
