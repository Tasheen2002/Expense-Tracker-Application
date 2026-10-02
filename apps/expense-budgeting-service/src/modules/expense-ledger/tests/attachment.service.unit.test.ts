import { describe, it, expect, vi, beforeEach } from "vitest";
import { AttachmentService } from "../application/services/attachment.service";
import { IAttachmentRepository } from "../domain/repositories/attachment.repository";
import { Attachment } from "../domain/entities/attachment.entity";
import { AttachmentId } from "../domain/value-objects/attachment-id";
import { AttachmentNotFoundError } from "../domain/errors/expense.errors";

describe("AttachmentService Tenant Isolation Tests", () => {
  let service: AttachmentService;
  let mockAttachmentRepo: Partial<IAttachmentRepository>;

  beforeEach(() => {
    mockAttachmentRepo = {
      saveWithinSizeLimit: vi.fn(),
      findById: vi.fn(),
      findByExpense: vi.fn(),
      delete: vi.fn(),
    };
    service = new AttachmentService(mockAttachmentRepo as IAttachmentRepository);
  });

  it("should enforce workspace isolation on createAttachment", async () => {
    const params = {
      expenseId: "exp-123",
      workspaceId: "workspace-123",
      fileName: "invoice.pdf",
      filePath: "/uploads/invoice.pdf",
      fileSize: 1024,
      mimeType: "application/pdf",
      uploadedBy: "user-123",
    };

    const result = await service.createAttachment(params);

    expect(result).toBeDefined();
    expect(mockAttachmentRepo.saveWithinSizeLimit).toHaveBeenCalledWith(
      expect.any(Attachment),
      "workspace-123",
      50 * 1024 * 1024
    );
  });

  it("should enforce workspace isolation on deleteAttachment", async () => {
    const attachment = Attachment.create({
      expenseId: "exp-123",
      fileName: "receipt.png",
      filePath: "/uploads/receipt.png",
      fileSize: 2048,
      mimeType: "image/png",
      uploadedBy: "user-123",
    });

    vi.mocked(mockAttachmentRepo.findById!).mockResolvedValue(attachment);

    await service.deleteAttachment(
      attachment.id.getValue(),
      "exp-123",
      "workspace-123"
    );

    expect(mockAttachmentRepo.findById).toHaveBeenCalledWith(
      attachment.id,
      "workspace-123"
    );
    expect(mockAttachmentRepo.delete).toHaveBeenCalledWith(
      attachment.id,
      "workspace-123"
    );
  });

  it("should throw AttachmentNotFoundError when attachment is not in workspace", async () => {
    vi.mocked(mockAttachmentRepo.findById!).mockResolvedValue(null);

    const validId = AttachmentId.create().getValue();
    await expect(
      service.deleteAttachment(validId, "exp-123", "workspace-other")
    ).rejects.toThrow(AttachmentNotFoundError);
  });

  it("should enforce workspace isolation on getAttachmentDTOById", async () => {
    const attachment = Attachment.create({
      expenseId: "exp-123",
      fileName: "receipt.png",
      filePath: "/uploads/receipt.png",
      fileSize: 2048,
      mimeType: "image/png",
      uploadedBy: "user-123",
    });

    vi.mocked(mockAttachmentRepo.findById!).mockResolvedValue(attachment);

    const result = await service.getAttachmentDTOById(
      attachment.id.getValue(),
      "workspace-123"
    );

    expect(result).toBeDefined();
    expect(mockAttachmentRepo.findById).toHaveBeenCalledWith(
      attachment.id,
      "workspace-123"
    );
  });

  it("should enforce workspace isolation on getAttachmentDTOsByExpense", async () => {
    vi.mocked(mockAttachmentRepo.findByExpense!).mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
      hasMore: false,
    });

    await service.getAttachmentDTOsByExpense("exp-123", "workspace-123");

    expect(mockAttachmentRepo.findByExpense).toHaveBeenCalledWith(
      "exp-123",
      "workspace-123",
      undefined
    );
  });
});
