import { z } from "zod";
import {
  VIOLATION_NOTE_MAX_LENGTH,
  OVERRIDE_REASON_MIN_LENGTH,
  OVERRIDE_REASON_MAX_LENGTH,
} from "../../../domain/constants/policy-controls.constants";

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

export type AcknowledgeViolationInput = z.infer<
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

export type ResolveViolationInput = z.infer<typeof resolveViolationSchema>;

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

export type OverrideViolationInput = z.infer<typeof overrideViolationSchema>;

/**
 * Exempt Violation Schema
 */
export const exemptViolationSchema = z.object({
  exemptionId: z.string().uuid("Invalid exemption ID format"),
});

export type ExemptViolationInput = z.infer<typeof exemptViolationSchema>;
