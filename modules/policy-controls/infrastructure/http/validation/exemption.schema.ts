import { z } from "zod";
import { toJsonSchema } from "./validator";
import { ExemptionStatus } from "../../../domain/enums/exemption-status.enum";
import {
  EXEMPTION_REASON_MIN_LENGTH,
  EXEMPTION_REASON_MAX_LENGTH,
  EXEMPTION_MAX_DURATION_DAYS,
  VIOLATION_NOTE_MAX_LENGTH,
  MAX_THRESHOLD_AMOUNT,
  MAX_ALLOWED_CATEGORIES,
} from "../../../domain/constants/policy-controls.constants";

/**
 * Exemption Scope Schema
 */
export const exemptionScopeSchema = z.object({
  categoryIds: z
    .array(z.string().uuid())
    .max(MAX_ALLOWED_CATEGORIES)
    .optional(),
  maxAmount: z.number().min(0).max(MAX_THRESHOLD_AMOUNT).optional(),
});

/**
 * Exemption Params Schema
 */
export const exemptionParamsSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID format"),
  exemptionId: z.string().uuid("Invalid exemption ID format"),
});

/**
 * Exemption Query Schema
 */
export const exemptionQuerySchema = z.object({
  status: z.nativeEnum(ExemptionStatus).optional(),
  userId: z.string().uuid().optional(),
  policyId: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

/**
 * Check Active Exemption Query Schema
 */
export const checkActiveExemptionQuerySchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  policyId: z.string().uuid("Invalid policy ID format"),
});

/**
 * Request Exemption Schema
 */
export const requestExemptionSchema = z
  .object({
    policyId: z.string().uuid("Invalid policy ID format"),
    userId: z.string().uuid("Invalid user ID format"),
    reason: z
      .string()
      .min(
        EXEMPTION_REASON_MIN_LENGTH,
        `Reason must be at least ${EXEMPTION_REASON_MIN_LENGTH} characters`,
      )
      .max(
        EXEMPTION_REASON_MAX_LENGTH,
        `Reason cannot exceed ${EXEMPTION_REASON_MAX_LENGTH} characters`,
      ),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    scope: exemptionScopeSchema.optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "endDate must be after startDate",
    path: ["endDate"],
  })
  .refine(
    (data) => {
      const durationDays = Math.ceil(
        (data.endDate.getTime() - data.startDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return durationDays <= EXEMPTION_MAX_DURATION_DAYS;
    },
    {
      message: `Exemption duration cannot exceed ${EXEMPTION_MAX_DURATION_DAYS} days`,
      path: ["endDate"],
    },
  );

export type RequestExemptionInput = z.infer<typeof requestExemptionSchema>;

/**
 * Approve Exemption Schema
 */
export const approveExemptionSchema = z.object({
  approvalNote: z
    .string()
    .max(
      VIOLATION_NOTE_MAX_LENGTH,
      `Approval note cannot exceed ${VIOLATION_NOTE_MAX_LENGTH} characters`,
    )
    .optional(),
});

export type ApproveExemptionInput = z.infer<typeof approveExemptionSchema>;

/**
 * Reject Exemption Schema
 */
export const rejectExemptionSchema = z.object({
  rejectionReason: z
    .string()
    .min(
      EXEMPTION_REASON_MIN_LENGTH,
      `Rejection reason must be at least ${EXEMPTION_REASON_MIN_LENGTH} characters`,
    )
    .max(
      EXEMPTION_REASON_MAX_LENGTH,
      `Rejection reason cannot exceed ${EXEMPTION_REASON_MAX_LENGTH} characters`,
    ),
});

export type RejectExemptionInput = z.infer<typeof rejectExemptionSchema>;

// Pre-computed JSON schemas
export const exemptionParamsJsonSchema = toJsonSchema(exemptionParamsSchema);
export const exemptionQueryJsonSchema = toJsonSchema(exemptionQuerySchema);
export const checkActiveExemptionQueryJsonSchema = toJsonSchema(checkActiveExemptionQuerySchema);
export const requestExemptionBodyJsonSchema = toJsonSchema(requestExemptionSchema);
export const approveExemptionBodyJsonSchema = toJsonSchema(approveExemptionSchema);
export const rejectExemptionBodyJsonSchema = toJsonSchema(rejectExemptionSchema);

export const exemptionResponseSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  policyId: z.string(),
  userId: z.string(),
  status: z.nativeEnum(ExemptionStatus),
  reason: z.string(),
  requestedBy: z.string(),
  approvedBy: z.string().nullable().optional(),
  approvedAt: z.string().nullable().optional(),
  rejectedBy: z.string().nullable().optional(),
  rejectedAt: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  startDate: z.string(),
  endDate: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const exemptionEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: exemptionResponseSchema,
  })
);

export const createExemptionEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: exemptionResponseSchema,
  })
);

export const exemptionListEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(exemptionResponseSchema),
      total: z.number().int(),
      limit: z.number().int(),
      offset: z.number().int(),
      hasMore: z.boolean(),
    }),
  })
);

export const activeExemptionEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: exemptionResponseSchema.nullable(),
  })
);
export type ListExemptionsQuery = z.infer<typeof exemptionQuerySchema>;
export type CheckActiveExemptionQuery = z.infer<typeof checkActiveExemptionQuerySchema>;
