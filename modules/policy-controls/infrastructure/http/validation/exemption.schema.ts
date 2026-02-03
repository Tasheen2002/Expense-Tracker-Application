import { z } from "zod";
import {
  EXEMPTION_REASON_MIN_LENGTH,
  EXEMPTION_REASON_MAX_LENGTH,
  EXEMPTION_MAX_DURATION_DAYS,
  VIOLATION_NOTE_MAX_LENGTH,
  MAX_THRESHOLD_AMOUNT,
  MAX_ALLOWED_CATEGORIES,
} from "../../../domain/constants/policy-controls.constants";

/**
 * Exemption scope schema
 */
export const exemptionScopeSchema = z.object({
  categoryIds: z
    .array(z.string().uuid())
    .max(MAX_ALLOWED_CATEGORIES)
    .optional(),
  maxAmount: z.number().min(0).max(MAX_THRESHOLD_AMOUNT).optional(),
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
    validFrom: z.coerce.date(),
    validUntil: z.coerce.date(),
    scope: exemptionScopeSchema.optional(),
  })
  .refine((data) => data.validUntil > data.validFrom, {
    message: "validUntil must be after validFrom",
    path: ["validUntil"],
  })
  .refine(
    (data) => {
      const durationDays = Math.ceil(
        (data.validUntil.getTime() - data.validFrom.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return durationDays <= EXEMPTION_MAX_DURATION_DAYS;
    },
    {
      message: `Exemption duration cannot exceed ${EXEMPTION_MAX_DURATION_DAYS} days`,
      path: ["validUntil"],
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
