import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReceiptService } from "../application/services/receipt.service";
import { IReceiptRepository } from "../domain/repositories/receipt.repository";
import { IReceiptMetadataRepository } from "../domain/repositories/receipt-metadata.repository";
import { IReceiptTagRepository } from "../domain/repositories/receipt-tag.repository";
import { ISignedFileStorageService } from "../domain/ports/file-storage.port";
import { Receipt } from "../domain/entities/receipt.entity";
import { StorageLocation } from "../domain/value-objects/storage-location";
import { ReceiptType } from "../domain/enums/receipt-type";

describe("ReceiptService", () => {
  let service: ReceiptService;
  let receiptRepository: IReceiptRepository;
  let metadataRepository: IReceiptMetadataRepository;
  let tagRepository: IReceiptTagRepository;
  let fileStorage: ISignedFileStorageService;

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
    } as unknown as ISignedFileStorageService;

    service = new ReceiptService(
      receiptRepository,
      metadataRepository,
      tagRepository,
      fileStorage,
    );
  });

  const mockReceipt = Receipt.create({
    workspaceId: "123e4567-e89b-42d3-a456-426614174000",
    userId: "123e4567-e89b-42d3-a456-426614174001",
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
      workspaceId: "123e4567-e89b-42d3-a456-426614174000",
      userId: "123e4567-e89b-42d3-a456-426614174001",
      fileName: "test.pdf",
      originalName: "test.pdf",
      mimeType: "application/pdf",
      fileContent: Buffer.from('%PDF-1.7 synthetic receipt').toString('base64'),
    };

    vi.mocked(fileStorage.upload).mockResolvedValue({ storageKey: 'managed.pdf', storageBucket: 'local' });
    await service.uploadReceipt(data);

    expect(receiptRepository.save).toHaveBeenCalled();
  });

  it("should get download url", async () => {
    vi.spyOn(receiptRepository, "findById").mockResolvedValue(mockReceipt);
    vi.spyOn(fileStorage, "generateSignedUrl").mockResolvedValue(
      "http://signed-url",
    );

    const url = await service.getDownloadUrl(
      mockReceipt.id.getValue(),
      "123e4567-e89b-42d3-a456-426614174000",
      "123e4567-e89b-42d3-a456-426614174001",
    );

    expect(url).toBe("http://signed-url");
    expect(fileStorage.generateSignedUrl).toHaveBeenCalledWith(
      "test-key",
      "test-bucket",
    );
  });
  it('removes uploaded bytes when persistence fails', async () => {
    vi.mocked(fileStorage.upload).mockResolvedValue({ storageKey: 'managed.pdf', storageBucket: 'local' });
    vi.mocked(receiptRepository.save).mockRejectedValue(new Error('database write failed'));
    await expect(service.uploadReceipt({ workspaceId: '123e4567-e89b-42d3-a456-426614174000', userId: '123e4567-e89b-42d3-a456-426614174001', originalName: 'receipt.pdf', mimeType: 'application/pdf', fileContent: Buffer.from('%PDF-1.7').toString('base64') })).rejects.toThrow('database write failed');
    expect(fileStorage.delete).toHaveBeenCalledWith('managed.pdf', 'local');
  });
  it('rejects malformed base64 before storage', async () => {
    await expect(service.uploadReceipt({ workspaceId: '123e4567-e89b-42d3-a456-426614174000', userId: '123e4567-e89b-42d3-a456-426614174001', originalName: 'receipt.pdf', mimeType: 'application/pdf', fileContent: 'invalid!!!' })).rejects.toThrow();
    expect(fileStorage.upload).not.toHaveBeenCalled();
  });
  it('accepts large canonical base64 without exhausting the regex stack', async () => {
    const bytes = Buffer.alloc(8 * 1024 * 1024, 65);
    bytes.write('%PDF-1.7');
    vi.mocked(fileStorage.upload).mockResolvedValue({ storageKey: 'managed.pdf', storageBucket: 'local' });
    await service.uploadReceipt({ workspaceId: '123e4567-e89b-42d3-a456-426614174000', userId: '123e4567-e89b-42d3-a456-426614174001', originalName: 'large.pdf', mimeType: 'application/pdf', fileContent: bytes.toString('base64') });
    expect(vi.mocked(fileStorage.upload).mock.calls[0][0].equals(bytes)).toBe(true);
  });
  it('rejects download by another actor before accessing storage', async () => {
    vi.mocked(receiptRepository.findById).mockResolvedValue(mockReceipt);
    await expect(service.downloadReceipt(mockReceipt.id.getValue(), '123e4567-e89b-42d3-a456-426614174000', 'other-user')).rejects.toThrow();
    expect(fileStorage.download).not.toHaveBeenCalled();
  });
  it('fails closed when the expense ownership port is absent', async () => {
    vi.mocked(receiptRepository.findById).mockResolvedValue(mockReceipt);
    await expect(service.linkToExpense(mockReceipt.id.getValue(), 'expense-1', '123e4567-e89b-42d3-a456-426614174000', '123e4567-e89b-42d3-a456-426614174001')).rejects.toMatchObject({ statusCode: 503 });
    expect(receiptRepository.save).not.toHaveBeenCalled();
  });
  // Wait, createLocal() creates undefined key.
  // And I updated service to throw if key is undefined.
  // So this test expectation might fail if I don't provide key.
  // I should use createS3 or manually create storage location with key for test.
});
