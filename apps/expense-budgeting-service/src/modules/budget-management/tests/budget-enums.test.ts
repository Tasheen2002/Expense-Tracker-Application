import { describe, expect, it } from "vitest";
import { AlertLevel, getAlertLevel } from "../domain/enums/alert-level";
import { DEFAULT_ALERT_THRESHOLDS } from "../domain/constants/budget.constants";
import { InvalidAlertThresholdError } from "../domain/errors/budget.errors";

describe("budget alert levels", () => {
  it("uses the configured threshold boundaries", () => {
    expect(getAlertLevel(DEFAULT_ALERT_THRESHOLDS.INFO)).toBe(AlertLevel.INFO);
    expect(getAlertLevel(DEFAULT_ALERT_THRESHOLDS.WARNING)).toBe(AlertLevel.WARNING);
    expect(getAlertLevel(DEFAULT_ALERT_THRESHOLDS.CRITICAL)).toBe(AlertLevel.CRITICAL);
    expect(getAlertLevel(DEFAULT_ALERT_THRESHOLDS.EXCEEDED)).toBe(AlertLevel.EXCEEDED);
    expect(getAlertLevel(1000)).toBe(AlertLevel.EXCEEDED);
  });

  it("rejects non-finite percentages", () => {
    for (const percentage of [NaN, Infinity, -Infinity]) {
      expect(() => getAlertLevel(percentage)).toThrow(InvalidAlertThresholdError);
    }
  });
});
