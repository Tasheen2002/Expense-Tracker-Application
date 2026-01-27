/**
 * Expense Ledger Module Constants
 */

// Expense validation constants
export const EXPENSE_TITLE_MIN_LENGTH = 1
export const EXPENSE_TITLE_MAX_LENGTH = 255
export const EXPENSE_DESCRIPTION_MAX_LENGTH = 5000
export const EXPENSE_MERCHANT_MAX_LENGTH = 255

// Amount validation
export const MIN_EXPENSE_AMOUNT = 0.01
export const MAX_EXPENSE_AMOUNT = 999999999.99

// Category validation
export const CATEGORY_NAME_MIN_LENGTH = 1
export const CATEGORY_NAME_MAX_LENGTH = 100
export const CATEGORY_DESCRIPTION_MAX_LENGTH = 500
export const CATEGORY_COLOR_REGEX = /^#[0-9A-F]{6}$/i

// Tag validation
export const TAG_NAME_MIN_LENGTH = 1
export const TAG_NAME_MAX_LENGTH = 50
export const TAG_COLOR_REGEX = /^#[0-9A-F]{6}$/i

// Attachment validation
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024 // 10 MB
export const MIN_ATTACHMENT_SIZE = 1 // 1 byte
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
]

// Currency validation
export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AUD', 'CAD', 'CHF', 'SEK',
  'NZD', 'SGD', 'HKD', 'NOK', 'KRW', 'TRY', 'RUB', 'BRL', 'ZAR', 'MXN'
]

export const DEFAULT_CURRENCY = 'USD'

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// Date validation
export const MAX_EXPENSE_DATE_FUTURE_DAYS = 0 // Cannot create expenses for future dates
export const MAX_EXPENSE_DATE_PAST_YEARS = 10 // Can create expenses up to 10 years in the past

// Recurring expense constants
export const MIN_RECURRENCE_INTERVAL = 1
export const MAX_RECURRENCE_INTERVAL = 365
export const MAX_RECURRENCE_END_DATE_YEARS = 10
