import { InvalidAlertThresholdError } from "../errors/budget.errors";
import { DEFAULT_ALERT_THRESHOLDS } from "../constants/budget.constants";

export enum AlertLevel {
  INFO = "INFO", // 50% threshold
  WARNING = "WARNING", // 75% threshold
  CRITICAL = "CRITICAL", // 90% threshold
  EXCEEDED = "EXCEEDED", // 100%+ threshold
}

export const ALERT_THRESHOLDS: Readonly<Record<AlertLevel, number>> =
  DEFAULT_ALERT_THRESHOLDS;

export function getAlertLevel(spentPercentage: number): AlertLevel {
  if (!Number.isFinite(spentPercentage)) {
    throw new InvalidAlertThresholdError("Spending percentage must be finite");
  }

  if (spentPercentage >= ALERT_THRESHOLDS[AlertLevel.EXCEEDED]) {
    return AlertLevel.EXCEEDED;
  } else if (spentPercentage >= ALERT_THRESHOLDS[AlertLevel.CRITICAL]) {
    return AlertLevel.CRITICAL;
  } else if (spentPercentage >= ALERT_THRESHOLDS[AlertLevel.WARNING]) {
    return AlertLevel.WARNING;
  } else if (spentPercentage >= ALERT_THRESHOLDS[AlertLevel.INFO]) {
    return AlertLevel.INFO;
  }

  throw new InvalidAlertThresholdError(
    `Percentage ${spentPercentage} does not meet minimum alert threshold`,
  );
}
