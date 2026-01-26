export enum AlertLevel {
  INFO = 'INFO',           // 50% threshold
  WARNING = 'WARNING',     // 75% threshold
  CRITICAL = 'CRITICAL',   // 90% threshold
  EXCEEDED = 'EXCEEDED',   // 100%+ threshold
}

export const ALERT_THRESHOLDS: Record<AlertLevel, number> = {
  [AlertLevel.INFO]: 50,
  [AlertLevel.WARNING]: 75,
  [AlertLevel.CRITICAL]: 90,
  [AlertLevel.EXCEEDED]: 100,
}

export function getAlertLevel(spentPercentage: number): AlertLevel {
  if (spentPercentage >= 100) {
    return AlertLevel.EXCEEDED
  } else if (spentPercentage >= 90) {
    return AlertLevel.CRITICAL
  } else if (spentPercentage >= 75) {
    return AlertLevel.WARNING
  } else if (spentPercentage >= 50) {
    return AlertLevel.INFO
  }
  throw new Error(`Percentage ${spentPercentage} does not meet minimum alert threshold`)
}
