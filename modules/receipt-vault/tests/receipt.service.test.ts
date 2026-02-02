import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReceiptService } from "../application/services/receipt.service";
import { IReceiptRepository } from "../domain/repositories/receipt.repository";
import { IReceiptMetadataRepository } from "../domain/repositories/receipt-metadata.repository";
import { IReceiptTagRepository } from "../domain/repositories/receipt-tag.repository";
import { IFileStorageService } from "../domain/ports/file-storage.port";
import { Receipt } from "../domain/entities/receipt.entity";
import { StorageLocation } from "../domain/value-objects/storage-location";
import { ReceiptType } from "../domain/enums/receipt-type";
import { ReceiptStatus } from "../domain/enums/receipt-status";

describe("ReceiptService", () => {
  let service: ReceiptService;
  let receiptRepository: IReceiptRepository;
  let metadataRepository: IReceiptMetadataRepository;
  let tagRepository: IReceiptTagRepository;
  let fileStorage: IFileStorageService;

  beforeEach(() => {
    receiptRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByWorkspace: vi.fn(),
      findByExpenseId: vi.fn(),
      findByUserId: vi.fn(),
      findByFilters: vi.fn(),
      countByFilters: vi.fn(),
      findByFileHash: vi.fn(),
      findPendingReceipts: vi.fn(),
      findFailedReceipts: vi.fn(),
      exists: vi.fn(),
      delete: vi.fn(),
      countByWorkspace: vi.fn(),
      countByStatus: vi.fn(),
      deleteWithDependencies: vi.fn(),
    } as unknown as IReceiptRepository;

    metadataRepository = {
      save: vi.fn(),
      findByReceiptId: vi.fn(),
    } as unknown as IReceiptMetadataRepository;

    tagRepository = {
      addTag: vi.fn(),
      removeTag: vi.fn(),
      hasTag: vi.fn(),
      findTagsByReceipt: vi.fn(),
    } as unknown as IReceiptTagRepository;

    fileStorage = {
      upload: vi.fn(),
      download: vi.fn(),
      delete: vi.fn(),
      generateSignedUrl: vi.fn(),
    } as unknown as IFileStorageService;

    service = new ReceiptService(
      receiptRepository,
      metadataRepository,
      tagRepository,
      fileStorage,
    );
  });

  const mockReceipt = Receipt.create({
    workspaceId: "workspace-1",
    userId: "user-1",
    fileName: "test.pdf",
    originalName: "test.pdf",
    filePath: "/path",
    fileSize: 100,
    mimeType: "application/pdf",
    receiptType: ReceiptType.EXPENSE,
    storageLocation: StorageLocation.createS3("test-bucket", "test-key"),
  });

  it("should create receipt", async () => {
    const data = {
      workspaceId: "workspace-1",
      userId: "user-1",
      fileName: "test.pdf",
      originalName: "test.pdf",
      filePath: "/path",
      fileSize: 100,
      mimeType: "application/pdf",
      storageLocation: StorageLocation.createLocal(),
    };

    await service.uploadReceipt(data);

    expect(receiptRepository.save).toHaveBeenCalled();
  });

  it("should get download url", async () => {
    vi.spyOn(receiptRepository, "findById").mockResolvedValue(mockReceipt);
    vi.spyOn(fileStorage, "generateSignedUrl").mockResolvedValue(
      "http://signed-url",
    );

    const url = await service.getDownloadUrl(
      mockReceipt.getId().getValue(),
      "workspace-1",
      "user-1",
    );

    expect(url).toBe("http://signed-url");
    expect(fileStorage.generateSignedUrl).toHaveBeenCalledWith(
      "test-key",
      "test-bucket",
    );
  });
  // Wait, createLocal() creates undefined key.
  // And I updated service to throw if key is undefined.
  // So this test expectation might fail if I don't provide key.
  // I should use createS3 or manually create storage location with key for test.
});
