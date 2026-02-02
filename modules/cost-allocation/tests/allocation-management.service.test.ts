import { describe, it, expect, vi, beforeEach } from "vitest";
import { AllocationManagementService } from "../application/services/allocation-management.service";
import { DepartmentRepository } from "../domain/repositories/department.repository";
import { CostCenterRepository } from "../domain/repositories/cost-center.repository";
import { ProjectRepository } from "../domain/repositories/project.repository";
import { IWorkspaceAccessPort } from "../application/ports/workspace-access.port";
import { WorkspaceId } from "../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../identity-workspace/domain/value-objects/user-id.vo";
import {
  UnauthorizedAllocationAccessError,
  DuplicateDepartmentCodeError,
} from "../domain/errors/cost-allocation.errors";

describe("AllocationManagementService", () => {
  let service: AllocationManagementService;
  let departmentRepo: DepartmentRepository;
  let costCenterRepo: CostCenterRepository;
  let projectRepo: ProjectRepository;
  let workspaceAccess: IWorkspaceAccessPort;

  beforeEach(() => {
    departmentRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      findByCode: vi.fn(),
      findAll: vi.fn(),
      // Add other mocked methods as needed or cast as any if interface is large
    } as any;

    costCenterRepo = {
      save: vi.fn(),
      findByCode: vi.fn(),
    } as any;

    projectRepo = {
      save: vi.fn(),
      findByCode: vi.fn(),
    } as any;

    workspaceAccess = {
      isAdminOrOwner: vi.fn(),
    } as any;

    service = new AllocationManagementService(
      departmentRepo,
      costCenterRepo,
      projectRepo,
      workspaceAccess,
    );
  });

  describe("createDepartment", () => {
    const workspaceId = WorkspaceId.create().getValue();
    const actorId = UserId.create().getValue();
    const validParams = {
      workspaceId,
      actorId,
      name: "Engineering",
      code: "ENG",
    };

    it("should create department successfully if authorized", async () => {
      vi.mocked(workspaceAccess.isAdminOrOwner).mockResolvedValue(true);
      vi.mocked(departmentRepo.findByCode).mockResolvedValue(null);

      const result = await service.createDepartment(validParams);

      expect(workspaceAccess.isAdminOrOwner).toHaveBeenCalledWith(
        actorId,
        workspaceId,
      );
      expect(departmentRepo.save).toHaveBeenCalled();
      expect(result.getName()).toBe("Engineering");
    });

    it("should throw UnauthorizedAllocationAccessError if not admin/owner", async () => {
      vi.mocked(workspaceAccess.isAdminOrOwner).mockResolvedValue(false);

      await expect(service.createDepartment(validParams)).rejects.toThrow(
        UnauthorizedAllocationAccessError,
      );
      expect(departmentRepo.save).not.toHaveBeenCalled();
    });

    it("should throw DuplicateDepartmentCodeError if code exists", async () => {
      vi.mocked(workspaceAccess.isAdminOrOwner).mockResolvedValue(true);
      vi.mocked(departmentRepo.findByCode).mockResolvedValue({} as any);

      await expect(service.createDepartment(validParams)).rejects.toThrow(
        DuplicateDepartmentCodeError,
      );
    });
  });
});
