export enum NotificationStatus {
  /** Created and awaiting channel dispatch or in-app handling. */
  PENDING = "PENDING",
  /** Channel dispatch recorded as successful; does not imply recipient read it. */
  SENT = "SENT",
  /** The last channel dispatch attempt failed; retry policy is application-owned. */
  FAILED = "FAILED",
  /** Compatibility state for read notifications; readAt is the read timestamp. */
  READ = "READ",
}
