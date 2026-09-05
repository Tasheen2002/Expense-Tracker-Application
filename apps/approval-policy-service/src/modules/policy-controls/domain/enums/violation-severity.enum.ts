/**
 * Severity level of a policy violation
 */
export enum ViolationSeverity {
  LOW = "LOW", // Informational, does not block
  MEDIUM = "MEDIUM", // Warning, may require justification
  HIGH = "HIGH", // Requires approval to proceed
  CRITICAL = "CRITICAL", // Blocks the expense entirely
}

export const ViolationSeverityLabels: Record<ViolationSeverity, string> = {
  [ViolationSeverity.LOW]: "Low",
  [ViolationSeverity.MEDIUM]: "Medium",
  [ViolationSeverity.HIGH]: "High",
  [ViolationSeverity.CRITICAL]: "Critical",
};

export const ViolationSeverityOrder: Record<ViolationSeverity, number> = {
  [ViolationSeverity.LOW]: 1,
  [ViolationSeverity.MEDIUM]: 2,
  [ViolationSeverity.HIGH]: 3,
  [ViolationSeverity.CRITICAL]: 4,
};
