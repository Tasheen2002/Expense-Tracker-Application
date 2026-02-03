/**
 * Status of a policy violation
 */
export enum ViolationStatus {
  PENDING = "PENDING", // Violation detected, awaiting action
  ACKNOWLEDGED = "ACKNOWLEDGED", // User acknowledged the violation
  EXEMPTED = "EXEMPTED", // Exemption granted
  RESOLVED = "RESOLVED", // Issue has been resolved
  OVERRIDDEN = "OVERRIDDEN", // Manager override
}

export const ViolationStatusLabels: Record<ViolationStatus, string> = {
  [ViolationStatus.PENDING]: "Pending",
  [ViolationStatus.ACKNOWLEDGED]: "Acknowledged",
  [ViolationStatus.EXEMPTED]: "Exempted",
  [ViolationStatus.RESOLVED]: "Resolved",
  [ViolationStatus.OVERRIDDEN]: "Overridden",
};
