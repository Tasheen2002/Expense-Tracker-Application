import { z } from "zod";
import { toJsonSchema } from "./validator";
import {
  POLICY_NAME_MIN_LENGTH,
  POLICY_NAME_MAX_LENGTH,
  POLICY_DESCRIPTION_MAX_LENGTH,
  MIN_PRIORITY,
  MAX_PRIORITY,
  MIN_THRESHOLD_AMOUNT,
  MAX_THRESHOLD_AMOUNT,
  MAX_BLACKLISTED_MERCHANTS,
  MAX_RESTRICTED_CATEGORIES,
  MAX_ALLOWED_CATEGORIES,
} from "../../../domain/constants/policy-controls.constants";
import { PolicyType } from "../../../domain/enums/policy-type.enum";
import { ViolationSeverity } from "../../../domain/enums/violation-severity.enum";

/**
 * Workspace Params Schema
 */
export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID format"),
});

/**
 * Policy Params Schema
 */
export const policyParamsSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID format"),
  policyId: z.string().uuid("Invalid policy ID format"),
});

/**
 * Policy Query Schema
 */
export const policyQuerySchema = z.object({
  activeOnly: z
    .preprocess(
      (val) => (val === undefined ? undefined : val === 'true' || val === true),
      z.boolean().optional()
    ),
  policyType: z.nativeEnum(PolicyType).optional(),
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

/**
 * Policy configuration schema based on policy type
 */
export const policyConfigurationSchema = z.object({
  // For SPENDING_LIMIT, DAILY_LIMIT, WEEKLY_LIMIT, MONTHLY_LIMIT
  threshold: z
    .number()
    .min(MIN_THRESHOLD_AMOUNT)
    .max(MAX_THRESHOLD_AMOUNT)
    .optional(),
  currency: z.string().length(3).optional(),

  // For RECEIPT_REQUIRED, DESCRIPTION_REQUIRED
  requirementThreshold: z.number().min(0).optional(),

  // For CATEGORY_RESTRICTION
  restrictedCategoryIds: z
    .array(z.string().uuid())
    .max(MAX_RESTRICTED_CATEGORIES)
    .optional(),
  allowedCategoryIds: z
    .array(z.string().uuid())
    .max(MAX_ALLOWED_CATEGORIES)
    .optional(),

  // For MERCHANT_BLACKLIST
  blacklistedMerchants: z
    .array(z.string().min(1).max(100))
    .max(MAX_BLACKLISTED_MERCHANTS)
    .optional(),

  // For TIME_RESTRICTION
  blockedDays: z.array(z.number().min(0).max(6)).optional(),
  blockedHoursStart: z.number().min(0).max(23).optional(),
  blockedHoursEnd: z.number().min(0).max(23).optional(),

  // For scope
  appliesTo: z
    .object({
      categoryIds: z.array(z.string().uuid()).optional(),
      userRoles: z.array(z.string()).optional(),
      minAmount: z.number().min(0).optional(),
      maxAmount: z.number().min(0).optional(),
    })
    .optional(),
});

/**
 * Create Policy Schema
 */
export const createPolicySchema = z.object({
  name: z
    .string()
    .min(POLICY_NAME_MIN_LENGTH, "Policy name is required")
    .max(
      POLICY_NAME_MAX_LENGTH,
      `Policy name cannot exceed ${POLICY_NAME_MAX_LENGTH} characters`,
    ),
  description: z
    .string()
    .max(
      POLICY_DESCRIPTION_MAX_LENGTH,
      `Description cannot exceed ${POLICY_DESCRIPTION_MAX_LENGTH} characters`,
    )
    .optional(),
  policyType: z.nativeEnum(PolicyType),
  severity: z.nativeEnum(ViolationSeverity),
  configuration: policyConfigurationSchema,
  priority: z
    .number()
    .int()
    .min(MIN_PRIORITY)
    .max(MAX_PRIORITY)
    .optional()
    .default(0),
});

export type CreatePolicyInput = z.infer<typeof createPolicySchema>;

/**
 * Update Policy Schema
 */
export const updatePolicySchema = z.object({
  name: z
    .string()
    .min(POLICY_NAME_MIN_LENGTH, "Policy name is required")
    .max(
      POLICY_NAME_MAX_LENGTH,
      `Policy name cannot exceed ${POLICY_NAME_MAX_LENGTH} characters`,
    )
    .optional(),
  description: z
    .string()
    .max(
      POLICY_DESCRIPTION_MAX_LENGTH,
      `Description cannot exceed ${POLICY_DESCRIPTION_MAX_LENGTH} characters`,
    )
    .optional(),
  severity: z.nativeEnum(ViolationSeverity).optional(),
  configuration: policyConfigurationSchema.optional(),
  priority: z.number().int().min(MIN_PRIORITY).max(MAX_PRIORITY).optional(),
});

export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>;

export const policyResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  policyType: z.nativeEnum(PolicyType),
  severity: z.nativeEnum(ViolationSeverity),
  configuration: z.record(z.any()),
  priority: z.number().int(),
  isActive: z.boolean(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Pre-computed JSON schemas
export const workspaceParamsJsonSchema = toJsonSchema(workspaceParamsSchema);
export const policyParamsJsonSchema = toJsonSchema(policyParamsSchema);
export const policyQueryJsonSchema = toJsonSchema(policyQuerySchema);
export const createPolicyBodyJsonSchema = toJsonSchema(createPolicySchema);
export const updatePolicyBodyJsonSchema = toJsonSchema(updatePolicySchema);

export const policyEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: policyResponseSchema,
  })
);

export const createPolicyEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: policyResponseSchema,
  })
);

export const policyListEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(policyResponseSchema),
      total: z.number().int(),
      limit: z.number().int(),
      offset: z.number().int(),
      hasMore: z.boolean(),
    }),
  })
);

export const policyActionSuccessResponseJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
  })
);

export const evaluateExpenseSchema = z.object({
  expenseId: z.string().uuid("Invalid expense ID format"),
  userId: z.string().uuid("Invalid user ID format"),
  amount: z.number().nonnegative("Amount must be non-negative"),
  currency: z.string().length(3, "Currency code must be 3 characters"),
  categoryId: z.string().uuid("Invalid category ID format").optional(),
  merchant: z.string().optional(),
  description: z.string().optional(),
  hasReceipt: z.boolean().default(false),
  expenseDate: z.coerce.date().optional(),
  userRole: z.string().optional(),
  timezone: z
    .string()
    .refine(
      (tz) => {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: tz });
          return true;
        } catch {
          return false;
        }
      },
      { message: "Invalid IANA timezone identifier" }
    )
    .optional(),
});

export type EvaluateExpenseBody = z.infer<typeof evaluateExpenseSchema>;
export const evaluateExpenseBodyJsonSchema = toJsonSchema(evaluateExpenseSchema);

export const evaluateExpenseEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      passed: z.boolean(),
      requiresApproval: z.boolean(),
      approvalRequiredPolicyIds: z.array(z.string()),
      violationIds: z.array(z.string()),
      blockedByPolicyId: z.string().optional(),
    }),
  })
);

export const checkExpenseSchema = z.object({
  amount: z.number().nonnegative("Amount must be non-negative"),
  currency: z.string().length(3, "Currency code must be 3 characters"),
  categoryId: z.string().uuid("Invalid category ID format").optional(),
  merchant: z.string().optional(),
  description: z.string().optional(),
  hasReceipt: z.boolean().default(false),
  expenseDate: z.coerce.date().optional(),
  timezone: z
    .string()
    .refine(
      (tz) => {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: tz });
          return true;
        } catch {
          return false;
        }
      },
      { message: "Invalid IANA timezone identifier" }
    )
    .optional(),
});

export type CheckExpenseBody = z.infer<typeof checkExpenseSchema>;
export const checkExpenseBodyJsonSchema = toJsonSchema(checkExpenseSchema);

export const checkExpenseEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      wouldPass: z.boolean(),
      requiresApproval: z.boolean(),
      approvalRequiredPolicyIds: z.array(z.string()),
      potentialViolations: z.array(
        z.object({
          policyName: z.string(),
          policyType: z.string(),
          severity: z.string(),
          details: z.string(),
        })
      ),
    }),
  })
);

export type ListPoliciesQuery = z.infer<typeof policyQuerySchema>;
