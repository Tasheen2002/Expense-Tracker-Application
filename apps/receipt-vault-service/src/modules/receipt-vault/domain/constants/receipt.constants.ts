/**
 * Receipt Vault Domain Constants
 */

// File size limits
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const MIN_FILE_SIZE = 1 // 1 byte

// File name limits
export const MAX_FILE_NAME_LENGTH = 255
export const MIN_FILE_NAME_LENGTH = 1

// Tag limits
export const MAX_TAG_NAME_LENGTH = 50
export const MIN_TAG_NAME_LENGTH = 1
export const MAX_TAG_DESCRIPTION_LENGTH = 255

// Color validation
export const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/

// UUID validation
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// MIME type validation
export const MIME_TYPE_REGEX = /^[a-z]+\/[a-z0-9\-\+\.]+$/i

// Allowed MIME types for receipts
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
]

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
]

export const ALLOWED_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  ...ALLOWED_DOCUMENT_MIME_TYPES,
]

// OCR confidence thresholds
export const MIN_OCR_CONFIDENCE = 0
export const MAX_OCR_CONFIDENCE = 100

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100
export const MIN_PAGE_SIZE = 1

// Metadata limits
export const MAX_MERCHANT_NAME_LENGTH = 255
export const MAX_INVOICE_NUMBER_LENGTH = 100
export const MAX_PO_NUMBER_LENGTH = 100
export const MAX_NOTES_LENGTH = 5000

// Currency code length
export const CURRENCY_CODE_LENGTH = 3
