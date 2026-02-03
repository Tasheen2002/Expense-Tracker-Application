/**
 * Status of synchronization session
 */
export enum SyncStatus {
  PENDING = "PENDING", // Sync scheduled but not started
  IN_PROGRESS = "IN_PROGRESS", // Currently syncing
  COMPLETED = "COMPLETED", // Sync completed successfully
  FAILED = "FAILED", // Sync failed with errors
  PARTIAL = "PARTIAL", // Sync completed with some errors
}
