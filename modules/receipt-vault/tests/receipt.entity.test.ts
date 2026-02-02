import { describe, it, expect } from "vitest";
import { Receipt } from "../domain/entities/receipt.entity";
import { ReceiptStatus } from "../domain/enums/receipt-status";
import { ReceiptType } from "../domain/enums/receipt-type";
import { StorageLocation } from "../domain/value-objects/storage-location";
import { StorageProvider } from "../domain/enums/storage-provider";
import {
  InvalidStatusTransitionError,
  InvalidReceiptOperationError,
  ReceiptValidationError,
} from "../domain/errors/receipt.errors";

describe("Receipt Entity", () => {
  const validData = {
    workspaceId: "workspace-123",
    userId: "user-123",
    fileName: "receipt.pdf",
    originalName: "My Receipt.pdf",
    filePath: "/tmp/receipt.pdf",
    fileSize: 1024,
    mimeType: "application/pdf",
    receiptType: ReceiptType.EXPENSE,
    storageLocation: StorageLocation.createLocal(),
  };

  it("should create a receipt with valid data", () => {
    const receipt = Receipt.create(validData);

    expect(receipt.getId()).toBeDefined();
    expect(receipt.getStatus()).toBe(ReceiptStatus.PENDING);
    expect(receipt.getWorkspaceId()).toBe(validData.workspaceId);
    expect(receipt.getFileInfo().getFileName()).toBe(validData.fileName);
  });

  it("should validate receipt type", () => {
    const receipt = Receipt.create(validData);
    expect(receipt.getReceiptType()).toBe(ReceiptType.EXPENSE);
  });

  it("should transition status correctly", () => {
    const receipt = Receipt.create(validData);

    receipt.startProcessing();
    expect(receipt.getStatus()).toBe(ReceiptStatus.PROCESSING);

    receipt.markAsProcessed("OCR Text", 0.95);
    expect(receipt.getStatus()).toBe(ReceiptStatus.PROCESSED);
    expect(receipt.getOcrText()).toBe("OCR Text");
    expect(receipt.getOcrConfidence()?.toNumber()).toBe(0.95);

    receipt.verify();
    expect(receipt.getStatus()).toBe(ReceiptStatus.VERIFIED);
  });

  it("should throw error on invalid status transition", () => {
    const receipt = Receipt.create(validData);

    // PENDING -> VERIFIED is invalid (must be PROCESSED first)
    expect(() => receipt.verify()).toThrow(InvalidReceiptOperationError);
  });

  it("should link to expense", () => {
    const receipt = Receipt.create(validData);
    receipt.linkToExpense("expense-123");

    expect(receipt.getExpenseId()).toBe("expense-123");
    expect(receipt.isLinkedToExpense()).toBe(true);
  });

  it("should unlink from expense", () => {
    const receipt = Receipt.create(validData);
    receipt.linkToExpense("expense-123");
    receipt.unlinkFromExpense();

    expect(receipt.getExpenseId()).toBeUndefined();
    expect(receipt.isLinkedToExpense()).toBe(false);
  });

  it("should validate OCR confidence", () => {
    const receipt = Receipt.create(validData);
    receipt.startProcessing();

    expect(() => receipt.markAsProcessed("text", 101)).toThrow(
      ReceiptValidationError,
    );
    expect(() => receipt.markAsProcessed("text", -0.1)).toThrow(
      ReceiptValidationError,
    );
  });
});
