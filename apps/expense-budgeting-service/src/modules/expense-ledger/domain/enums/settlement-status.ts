export enum SettlementStatus {
  PENDING = "PENDING",
  PARTIAL = "PARTIAL",
  SETTLED = "SETTLED",
}

export function isValidSettlementStatus(value: string): value is SettlementStatus {
  return Object.values(SettlementStatus).includes(value as SettlementStatus);
}

