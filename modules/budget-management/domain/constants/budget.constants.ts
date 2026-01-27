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

// Budget period validation
export const MAX_BUDGET_PERIOD_YEARS = 10
export const MIN_BUDGET_PERIOD_DAYS = 1

// Allocation validation
export const MIN_ALLOCATION_AMOUNT = 0.01
export const ALLOCATION_DESCRIPTION_MAX_LENGTH = 500

// Alert threshold validation
export const MIN_ALERT_THRESHOLD = 0
export const MAX_ALERT_THRESHOLD = 100
export const DEFAULT_ALERT_THRESHOLDS = {
  INFO: 50,
  WARNING: 75,
  CRITICAL: 90,
  EXCEEDED: 100,
}

// Currency validation
export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AUD', 'CAD', 'CHF', 'SEK',
  'NZD', 'SGD', 'HKD', 'NOK', 'KRW', 'TRY', 'RUB', 'BRL', 'ZAR', 'MXN'
]

export const DEFAULT_CURRENCY = 'USD'

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// Spending limit constants
export const MAX_SPENDING_LIMITS_PER_WORKSPACE = 100
