/**
 * Status of imported bank transaction
 */
export enum TransactionStatus {
  PENDING = "PENDING", // Imported but not yet processed
  MATCHED = "MATCHED", // Matched with existing expense
  IMPORTED = "IMPORTED", // Imported as new expense
  IGNORED = "IGNORED", // User chose to ignore
  DUPLICATE = "DUPLICATE", // Detected as duplicate
}
