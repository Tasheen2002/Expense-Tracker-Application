import { z } from "zod";
import { toJsonSchema } from "./validator";
import { ViolationStatus } from "../../../domain/enums/violation-status.enum";
import {
  VIOLATION_NOTE_MAX_LENGTH,
  OVERRIDE_REASON_MIN_LENGTH,
  OVERRIDE_REASON_MAX_LENGTH,
} from "../../../domain/constants/policy-controls.constants";

/**
 * Violation Params Schema
 */
export const violationParamsSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID format"),
  violationId: z.string().uuid("Invalid violation ID format"),
});

/**
 * Violation Query Schema
 */
export const violationQuerySchema = z.object({
  status: z.nativeEnum(ViolationStatus).optional(),
  userId: z.string().uuid().optional(),
  expenseId: z.string().uuid().optional(),
  policyId: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

/**
 * Violation Stats Query Schema
 */
export const violationStatsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * Acknowledge Violation Schema
 */
export const acknowledgeViolationSchema = z.object({
  note: z
    .string()
    .max(
      VIOLATION_NOTE_MAX_LENGTH,
      `Note cannot exceed ${VIOLATION_NOTE_MAX_LENGTH} characters`,
    )
    .optional(),
});

export type AcknowledgeViolationBody = z.infer<
  typeof acknowledgeViolationSchema
>;

/**
 * Resolve Violation Schema
 */
export const resolveViolationSchema = z.object({
  resolutionNote: z
    .string()
    .max(
      VIOLATION_NOTE_MAX_LENGTH,
      `Resolution note cannot exceed ${VIOLATION_NOTE_MAX_LENGTH} characters`,
    )
    .optional(),
});

export type ResolveViolationBody = z.infer<typeof resolveViolationSchema>;

/**
 * Override Violation Schema
 */
export const overrideViolationSchema = z.object({
  overrideReason: z
    .string()
    .min(
      OVERRIDE_REASON_MIN_LENGTH,
      `Override reason must be at least ${OVERRIDE_REASON_MIN_LENGTH} characters`,
    )
    .max(
      OVERRIDE_REASON_MAX_LENGTH,
      `Override reason cannot exceed ${OVERRIDE_REASON_MAX_LENGTH} characters`,
    ),
});

export type OverrideViolationBody = z.infer<typeof overrideViolationSchema>;

/**
 * Exempt Violation Schema
 */
export const exemptViolationSchema = z.object({
  exemptionId: z.string().uuid("Invalid exemption ID format"),
});

export type ExemptViolationBody = z.infer<typeof exemptViolationSchema>;

// Pre-computed JSON schemas
export const violationParamsJsonSchema = toJsonSchema(violationParamsSchema);
export const violationQueryJsonSchema = toJsonSchema(violationQuerySchema);
export const violationStatsQueryJsonSchema = toJsonSchema(violationStatsQuerySchema);
export const acknowledgeViolationBodyJsonSchema = toJsonSchema(acknowledgeViolationSchema);
export const resolveViolationBodyJsonSchema = toJsonSchema(resolveViolationSchema);
export const overrideViolationBodyJsonSchema = toJsonSchema(overrideViolationSchema);
export const exemptViolationBodyJsonSchema = toJsonSchema(exemptViolationSchema);

import { ViolationSeverity } from "../../../domain/enums/violation-severity.enum";

export const violationResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  policyId: z.string().uuid(),
  expenseId: z.string(),
  userId: z.string(),
  status: z.nativeEnum(ViolationStatus),
  severity: z.nativeEnum(ViolationSeverity),
  violationDetails: z.string(),
  expenseAmount: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  acknowledgedAt: z.string().nullable().optional(),
  acknowledgedBy: z.string().nullable().optional(),
  resolvedAt: z.string().nullable().optional(),
  resolvedBy: z.string().nullable().optional(),
  resolutionNotes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const violationEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: violationResponseSchema,
  })
);

export const violationListEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(violationResponseSchema),
      total: z.number().int(),
      limit: z.number().int(),
      offset: z.number().int(),
      hasMore: z.boolean(),
    }),
  })
);

export const violationStatsEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      total: z.number().int(),
      pending: z.number().int(),
      byStatus: z.record(z.number().int()),
      bySeverity: z.record(z.number().int()),
    }),
  })
);

export type ListViolationsQuery = z.infer<typeof violationQuerySchema>;
export type GetViolationStatsQuery = z.infer<typeof violationStatsQuerySchema>;
