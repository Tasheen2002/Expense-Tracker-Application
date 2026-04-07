import { z } from 'zod';
import {
  SUPPLIER_NAME_MIN_LENGTH,
  SUPPLIER_NAME_MAX_LENGTH,
  LOCATION_NAME_MIN_LENGTH,
  LOCATION_NAME_MAX_LENGTH,
  VARIANT_NAME_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  MIN_QUANTITY,
  MAX_QUANTITY,
  MIN_UNIT_PRICE,
  MAX_UNIT_PRICE,
  SUPPORTED_CURRENCIES,
} from '../../../domain/constants/inventory.constants';
import { LocationType } from '../../../domain/enums/location-type';
import { PurchaseOrderStatus } from '../../../domain/enums/purchase-order-status';
import { TransactionType } from '../../../domain/enums/transaction-type';

// ============================================
// Params Schemas
// ============================================

export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
});

export const supplierParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  supplierId: z.string().uuid('Invalid supplier ID format'),
});

export const locationParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  locationId: z.string().uuid('Invalid location ID format'),
});

export const purchaseOrderParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  purchaseOrderId: z.string().uuid('Invalid purchase order ID format'),
});

export const purchaseOrderItemParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  purchaseOrderId: z.string().uuid('Invalid purchase order ID format'),
  itemId: z.string().uuid('Invalid item ID format'),
});

export const stockParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  stockId: z.string().uuid('Invalid stock ID format'),
});

// ============================================
// Supplier Schemas
// ============================================

export const createSupplierSchema = z.object({
  name: z
    .string()
    .min(SUPPLIER_NAME_MIN_LENGTH, 'Supplier name is required')
    .max(SUPPLIER_NAME_MAX_LENGTH, `Supplier name cannot exceed ${SUPPLIER_NAME_MAX_LENGTH} characters`),
  contactEmail: z.string().email('Invalid email format').optional(),
  contactPhone: z.string().max(50).optional(),
  address: z.string().optional(),
});

export const updateSupplierSchema = z
  .object({
    name: z.string().min(SUPPLIER_NAME_MIN_LENGTH).max(SUPPLIER_NAME_MAX_LENGTH).optional(),
    contactEmail: z.string().email('Invalid email format').optional().nullable(),
    contactPhone: z.string().max(50).optional().nullable(),
    address: z.string().optional().nullable(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field must be provided',
  });

// ============================================
// Location Schemas
// ============================================

export const createLocationSchema = z.object({
  name: z
    .string()
    .min(LOCATION_NAME_MIN_LENGTH, 'Location name is required')
    .max(LOCATION_NAME_MAX_LENGTH, `Location name cannot exceed ${LOCATION_NAME_MAX_LENGTH} characters`),
  type: z.nativeEnum(LocationType).optional(),
  address: z.string().optional(),
});

export const updateLocationSchema = z
  .object({
    name: z.string().min(LOCATION_NAME_MIN_LENGTH).max(LOCATION_NAME_MAX_LENGTH).optional(),
    type: z.nativeEnum(LocationType).optional(),
    address: z.string().optional().nullable(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field must be provided',
  });

// ============================================
// Purchase Order Schemas
// ============================================

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid('Invalid supplier ID format'),
  orderDate: z.string().datetime('Invalid order date format'),
  expectedDate: z.string().datetime('Invalid expected date format').optional(),
  notes: z.string().max(NOTES_MAX_LENGTH).optional(),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter code')
    .refine((val) => SUPPORTED_CURRENCIES.includes(val), {
      message: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`,
    })
    .optional(),
});

export const updatePurchaseOrderSchema = z
  .object({
    notes: z.string().max(NOTES_MAX_LENGTH).optional().nullable(),
    expectedDate: z.string().datetime().optional().nullable(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field must be provided',
  });

export const addPurchaseOrderItemSchema = z.object({
  variantId: z.string().min(1, 'Variant ID is required').max(255),
  variantName: z.string().min(1, 'Variant name is required').max(VARIANT_NAME_MAX_LENGTH),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(MAX_QUANTITY),
  unitPrice: z.number().min(MIN_UNIT_PRICE).max(MAX_UNIT_PRICE),
});

// ============================================
// Stock Schemas
// ============================================

export const adjustStockSchema = z.object({
  variantId: z.string().min(1, 'Variant ID is required').max(255),
  locationId: z.string().uuid('Invalid location ID format'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(MAX_QUANTITY),
  type: z.nativeEnum(TransactionType),
  notes: z.string().max(NOTES_MAX_LENGTH).optional(),
  referenceId: z.string().uuid().optional(),
  referenceType: z.string().max(50).optional(),
});

export const updateStockSettingsSchema = z
  .object({
    reorderLevel: z.number().int().min(MIN_QUANTITY).max(MAX_QUANTITY).optional(),
    reorderQuantity: z.number().int().min(MIN_QUANTITY).max(MAX_QUANTITY).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field must be provided',
  });

// ============================================
// List Query Schemas
// ============================================

export const listQuerySchema = z.object({
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().min(0)).optional(),
});

export const listPurchaseOrdersQuerySchema = z.object({
  status: z.nativeEnum(PurchaseOrderStatus).optional(),
  supplierId: z.string().uuid().optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().min(0)).optional(),
});

export const listStockQuerySchema = z.object({
  locationId: z.string().uuid().optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().min(0)).optional(),
});

export const listTransactionsQuerySchema = z.object({
  variantId: z.string().optional(),
  locationId: z.string().uuid().optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().min(0)).optional(),
});
