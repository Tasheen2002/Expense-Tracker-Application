import { ReceiptVaultError } from "./receipt.errors";

export class UnauthorizedAccessError extends ReceiptVaultError {
  constructor(userId: string, receiptId: string) {
    super(
      `User ${userId} is not authorized to access receipt ${receiptId}`,
      "UNAUTHORIZED_ACCESS",
      403,
    );
  }
}
