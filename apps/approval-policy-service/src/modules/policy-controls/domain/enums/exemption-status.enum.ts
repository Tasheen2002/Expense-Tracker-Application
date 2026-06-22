/**
 * Status of an exemption request
 */
export enum ExemptionStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
}

export const ExemptionStatusLabels: Record<ExemptionStatus, string> = {
  [ExemptionStatus.PENDING]: "Pending",
  [ExemptionStatus.APPROVED]: "Approved",
  [ExemptionStatus.REJECTED]: "Rejected",
  [ExemptionStatus.EXPIRED]: "Expired",
};
