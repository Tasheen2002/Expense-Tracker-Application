import { describe, it, expect, vi, beforeEach } from "vitest";
import { CategoryRuleService } from "../application/services/category-rule.service";
import { CategoryRuleRepository } from "../domain/repositories/category-rule.repository";
import { IWorkspaceAccessPort } from "../domain/ports/workspace-access.port";
import { WorkspaceId } from "../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../identity-workspace/domain/value-objects/user-id.vo";
import { RuleCondition } from "../domain/value-objects/rule-condition";
import { RuleConditionType } from "../domain/enums/rule-condition-type";
import { CategoryId } from "../../expense-ledger/domain/value-objects/category-id";
import { UnauthorizedRuleAccessError } from "../domain/errors/categorization-rules.errors";
import { CategoryRule } from "../domain/entities/category-rule.entity";

// Mocks
const mockRepository = {
  save: vi.fn(),
  findByName: vi.fn(),
  findById: vi.fn(),
  delete: vi.fn(),
  findByWorkspaceId: vi.fn(),
  findActiveByWorkspaceId: vi.fn(),
} as unknown as CategoryRuleRepository;

const mockWorkspaceAccess = {
  isAdminOrOwner: vi.fn(),
} as unknown as IWorkspaceAccessPort;

describe("CategoryRuleService Authorization", () => {
  let service: CategoryRuleService;

  beforeEach(() => {
    service = new CategoryRuleService(mockRepository, mockWorkspaceAccess);
    vi.clearAllMocks();
  });

  const workspaceIdStr = "123e4567-e89b-12d3-a456-426614174000";
  const userIdStr = "123e4567-e89b-12d3-a456-426614174001";
  const otherUserIdStr = "123e4567-e89b-12d3-a456-426614174002";
  const workspaceId = WorkspaceId.fromString(workspaceIdStr);
  const userId = UserId.fromString(userIdStr);
  const targetCategoryId = CategoryId.fromString(
    "123e4567-e89b-12d3-a456-426614174003",
  );
  // Assuming RuleConditionType.DESCRIPTION_CONTAINS exists and value is "uber"
  const condition = RuleCondition.create(
    RuleConditionType.DESCRIPTION_CONTAINS,
    "uber",
  );

  describe("createRule", () => {
    it("should allow creation if user is admin or owner", async () => {
      // Arrange
      vi.mocked(mockWorkspaceAccess.isAdminOrOwner).mockResolvedValue(true);
      vi.mocked(mockRepository.findByName).mockResolvedValue(null);

      // Act
      const result = await service.createRule({
        workspaceId,
        name: "Test Rule",
        condition,
        targetCategoryId,
        createdBy: userId,
      });

      // Assert
      expect(result).toBeDefined();
      expect(mockWorkspaceAccess.isAdminOrOwner).toHaveBeenCalledWith(
        userIdStr,
        workspaceIdStr,
      );
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it("should throw UnauthorizedRuleAccessError if user is NOT admin or owner", async () => {
      // Arrange
      vi.mocked(mockWorkspaceAccess.isAdminOrOwner).mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.createRule({
          workspaceId,
          name: "Test Rule",
          condition,
          targetCategoryId,
          createdBy: userId,
        }),
      ).rejects.toThrow(UnauthorizedRuleAccessError);
    });
  });

  describe("deleteRule", () => {
    it("should allow creator to delete rule", async () => {
      // Arrange
      const rule = CategoryRule.create({
        workspaceId,
        name: "My Rule",
        condition,
        targetCategoryId,
        createdBy: userId,
      });
      vi.mocked(mockRepository.findById).mockResolvedValue(rule);
      // Access check shouldn't matter if creator, but in my implementation calls checkAccess regardless or checks creator first?
      // Let's check impl: `const isCreator = ...; const isAdminOrOwner = ...; if (!isCreator && !isAdminOrOwner)`
      // It awaits checkAccess even if isCreator is true?
      // Yes, `const isAdminOrOwner = await this.checkAccess(...)`.
      // Optimization could be short-circuit, but currently it runs both.
      vi.mocked(mockWorkspaceAccess.isAdminOrOwner).mockResolvedValue(false);

      // Act
      await service.deleteRule(rule.getId(), userIdStr);

      // Assert
      expect(mockRepository.delete).toHaveBeenCalledWith(rule.getId());
    });

    it("should allow admin/owner to delete rule created by others", async () => {
      // Arrange
      const rule = CategoryRule.create({
        workspaceId,
        name: "Other Rule",
        condition,
        targetCategoryId,
        createdBy: UserId.fromString(otherUserIdStr),
      });
      vi.mocked(mockRepository.findById).mockResolvedValue(rule);
      vi.mocked(mockWorkspaceAccess.isAdminOrOwner).mockResolvedValue(true);

      // Act
      await service.deleteRule(rule.getId(), userIdStr);

      // Assert
      expect(mockRepository.delete).toHaveBeenCalledWith(rule.getId());
    });

    it("should throw Unauthorized if neither creator nor admin", async () => {
      // Arrange
      const rule = CategoryRule.create({
        workspaceId,
        name: "Other Rule",
        condition,
        targetCategoryId,
        createdBy: UserId.fromString(otherUserIdStr),
      });
      vi.mocked(mockRepository.findById).mockResolvedValue(rule);
      vi.mocked(mockWorkspaceAccess.isAdminOrOwner).mockResolvedValue(false);

      // Act & Assert
      await expect(service.deleteRule(rule.getId(), userIdStr)).rejects.toThrow(
        UnauthorizedRuleAccessError,
      );
    });
  });
});
