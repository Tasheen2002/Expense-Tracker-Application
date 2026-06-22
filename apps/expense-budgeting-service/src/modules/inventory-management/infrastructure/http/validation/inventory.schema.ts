import { z } from 'zod';
import { toJsonSchema } from './validator';
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
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const listPurchaseOrdersQuerySchema = z.object({
  status: z.nativeEnum(PurchaseOrderStatus).optional(),
  supplierId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const listStockQuerySchema = z.object({
  locationId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const listTransactionsQuerySchema = z.object({
  variantId: z.string().optional(),
  locationId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// ============================================
// Inferred Input Types
// ============================================

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;
export type AddPurchaseOrderItemInput = z.infer<typeof addPurchaseOrderItemSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
export type ListPurchaseOrdersQuery = z.infer<typeof listPurchaseOrdersQuerySchema>;
export type ListStockQuery = z.infer<typeof listStockQuerySchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;

// ============================================
// JSON Schemas
// ============================================

export const workspaceParamsJsonSchema = toJsonSchema(workspaceParamsSchema);
export const supplierParamsJsonSchema = toJsonSchema(supplierParamsSchema);
export const locationParamsJsonSchema = toJsonSchema(locationParamsSchema);
export const purchaseOrderParamsJsonSchema = toJsonSchema(purchaseOrderParamsSchema);
export const purchaseOrderItemParamsJsonSchema = toJsonSchema(purchaseOrderItemParamsSchema);
export const stockParamsJsonSchema = toJsonSchema(stockParamsSchema);

export const createSupplierBodyJsonSchema = toJsonSchema(createSupplierSchema);
export const updateSupplierBodyJsonSchema = toJsonSchema(updateSupplierSchema);

export const createLocationBodyJsonSchema = toJsonSchema(createLocationSchema);
export const updateLocationBodyJsonSchema = toJsonSchema(updateLocationSchema);

export const createPurchaseOrderBodyJsonSchema = toJsonSchema(createPurchaseOrderSchema);
export const updatePurchaseOrderBodyJsonSchema = toJsonSchema(updatePurchaseOrderSchema);
export const addPurchaseOrderItemBodyJsonSchema = toJsonSchema(addPurchaseOrderItemSchema);

export const adjustStockBodyJsonSchema = toJsonSchema(adjustStockSchema);
export const updateStockSettingsBodyJsonSchema = toJsonSchema(updateStockSettingsSchema);

export const listQueryJsonSchema = toJsonSchema(listQuerySchema);
export const listPurchaseOrdersQueryJsonSchema = toJsonSchema(listPurchaseOrdersQuerySchema);
export const listStockQueryJsonSchema = toJsonSchema(listStockQuerySchema);
export const listTransactionsQueryJsonSchema = toJsonSchema(listTransactionsQuerySchema);

// ============================================
// Response & Envelope Schemas
// ============================================

export const locationResponseSchema = z.object({
  locationId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(LocationType),
  address: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const supplierResponseSchema = z.object({
  supplierId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  address: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const stockResponseSchema = z.object({
  stockId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  variantId: z.string(),
  locationId: z.string().uuid(),
  quantity: z.number(),
  reservedQuantity: z.number(),
  availableQuantity: z.number(),
  reorderLevel: z.number(),
  reorderQuantity: z.number(),
  isLowStock: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const transactionResponseSchema = z.object({
  transactionId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  variantId: z.string(),
  locationId: z.string().uuid(),
  type: z.nativeEnum(TransactionType),
  quantity: z.number(),
  referenceId: z.string().nullable(),
  referenceType: z.string().nullable(),
  notes: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
});

export const purchaseOrderItemResponseSchema = z.object({
  itemId: z.string().uuid(),
  purchaseOrderId: z.string().uuid(),
  variantId: z.string(),
  variantName: z.string(),
  quantity: z.number(),
  unitPrice: z.string(),
  receivedQuantity: z.number(),
  lineTotal: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const purchaseOrderResponseSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  supplierId: z.string().uuid(),
  status: z.nativeEnum(PurchaseOrderStatus),
  orderDate: z.string(),
  expectedDate: z.string().nullable(),
  receivedDate: z.string().nullable(),
  notes: z.string().nullable(),
  totalAmount: z.string(),
  currency: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const purchaseOrderWithItemsResponseSchema = purchaseOrderResponseSchema.extend({
  items: z.array(purchaseOrderItemResponseSchema),
});

// Envelopes

const paginationSchema = z.object({
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
  hasMore: z.boolean(),
});

export const locationEnvelopeSchema = z.object({
  success: z.boolean(),
  statusCode: z.number(),
  message: z.string(),
  data: locationResponseSchema,
});

export const paginatedLocationsEnvelopeSchema = z.object({
  success: z.boolean(),
  statusCode: z.number(),
  message: z.string(),
  data: z.object({
    items: z.array(locationResponseSchema),
    pagination: paginationSchema,
  }),
});

export const supplierEnvelopeSchema = z.object({
  success: z.boolean(),
  statusCode: z.number(),
  message: z.string(),
  data: supplierResponseSchema,
});

export const paginatedSuppliersEnvelopeSchema = z.object({
  success: z.boolean(),
  statusCode: z.number(),
  message: z.string(),
  data: z.object({
    items: z.array(supplierResponseSchema),
    pagination: paginationSchema,
  }),
});

export const adjustStockEnvelopeSchema = z.object({
  success: z.boolean(),
  statusCode: z.number(),
  message: z.string(),
  data: z.object({
    stock: stockResponseSchema,
    transaction: transactionResponseSchema,
  }),
});

export const paginatedStockEnvelopeSchema = z.object({
  success: z.boolean(),
  statusCode: z.number(),
  message: z.string(),
  data: z.object({
    items: z.array(stockResponseSchema),
    pagination: paginationSchema,
  }),
});

export const paginatedTransactionsEnvelopeSchema = z.object({
  success: z.boolean(),
  statusCode: z.number(),
  message: z.string(),
  data: z.object({
    items: z.array(transactionResponseSchema),
    pagination: paginationSchema,
  }),
});

export const purchaseOrderEnvelopeSchema = z.object({
  success: z.boolean(),
  statusCode: z.number(),
  message: z.string(),
  data: purchaseOrderResponseSchema,
});

export const purchaseOrderWithItemsEnvelopeSchema = z.object({
  success: z.boolean(),
  statusCode: z.number(),
  message: z.string(),
  data: purchaseOrderWithItemsResponseSchema,
});

export const paginatedPurchaseOrdersEnvelopeSchema = z.object({
  success: z.boolean(),
  statusCode: z.number(),
  message: z.string(),
  data: z.object({
    items: z.array(purchaseOrderResponseSchema),
    pagination: paginationSchema,
  }),
});

export const purchaseOrderItemEnvelopeSchema = z.object({
  success: z.boolean(),
  statusCode: z.number(),
  message: z.string(),
  data: purchaseOrderItemResponseSchema,
});

// JSON Schema Exports for Envelopes
export const locationEnvelopeJsonSchema = toJsonSchema(locationEnvelopeSchema);
export const paginatedLocationsEnvelopeJsonSchema = toJsonSchema(paginatedLocationsEnvelopeSchema);

export const supplierEnvelopeJsonSchema = toJsonSchema(supplierEnvelopeSchema);
export const paginatedSuppliersEnvelopeJsonSchema = toJsonSchema(paginatedSuppliersEnvelopeSchema);

export const adjustStockEnvelopeJsonSchema = toJsonSchema(adjustStockEnvelopeSchema);
export const paginatedStockEnvelopeJsonSchema = toJsonSchema(paginatedStockEnvelopeSchema);
export const paginatedTransactionsEnvelopeJsonSchema = toJsonSchema(paginatedTransactionsEnvelopeSchema);

export const purchaseOrderEnvelopeJsonSchema = toJsonSchema(purchaseOrderEnvelopeSchema);
export const purchaseOrderWithItemsEnvelopeJsonSchema = toJsonSchema(purchaseOrderWithItemsEnvelopeSchema);
export const paginatedPurchaseOrdersEnvelopeJsonSchema = toJsonSchema(paginatedPurchaseOrdersEnvelopeSchema);
export const purchaseOrderItemEnvelopeJsonSchema = toJsonSchema(purchaseOrderItemEnvelopeSchema);
