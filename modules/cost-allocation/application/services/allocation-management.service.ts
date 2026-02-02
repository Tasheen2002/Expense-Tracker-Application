import { Department } from "../../domain/entities/department.entity";
import { CostCenter } from "../../domain/entities/cost-center.entity";
import { Project } from "../../domain/entities/project.entity";
import { DepartmentRepository } from "../../domain/repositories/department.repository";
import { CostCenterRepository } from "../../domain/repositories/cost-center.repository";
import { ProjectRepository } from "../../domain/repositories/project.repository";
import { DepartmentId } from "../../domain/value-objects/department-id";
import { CostCenterId } from "../../domain/value-objects/cost-center-id";
import { ProjectId } from "../../domain/value-objects/project-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";
import {
  DepartmentNotFoundError,
  CostCenterNotFoundError,
  ProjectNotFoundError,
  DuplicateDepartmentCodeError,
  DuplicateCostCenterCodeError,
  DuplicateProjectCodeError,
  UnauthorizedAllocationAccessError,
} from "../../domain/errors/cost-allocation.errors";
import { Decimal } from "@prisma/client/runtime/library";
import { IWorkspaceAccessPort } from "../ports/workspace-access.port";

export class AllocationManagementService {
  constructor(
    private readonly departmentRepository: DepartmentRepository,
    private readonly costCenterRepository: CostCenterRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly workspaceAccess: IWorkspaceAccessPort,
  ) {}

  // ==========================================
  // Department Management
  // ==========================================

  async createDepartment(params: {
    workspaceId: string;
    actorId: string;
    name: string;
    code: string;
    description?: string;
    managerId?: string;
    parentDepartmentId?: string;
  }): Promise<Department> {
    const workspaceId = WorkspaceId.fromString(params.workspaceId);

    if (
      !(await this.workspaceAccess.isAdminOrOwner(
        params.actorId,
        params.workspaceId,
      ))
    ) {
      throw new UnauthorizedAllocationAccessError("create department");
    }

    // Check for duplicate code
    const existing = await this.departmentRepository.findByCode(
      params.code,
      workspaceId,
    );
    if (existing) {
      throw new DuplicateDepartmentCodeError(params.code);
    }

    // specific validation for parent dept existence could be added here

    const department = Department.create({
      workspaceId,
      name: params.name,
      code: params.code,
      description: params.description,
      managerId: params.managerId
        ? UserId.fromString(params.managerId)
        : undefined,
      parentDepartmentId: params.parentDepartmentId
        ? DepartmentId.fromString(params.parentDepartmentId)
        : undefined,
    });

    await this.departmentRepository.save(department);
    return department;
  }

  async getDepartment(id: string): Promise<Department> {
    const department = await this.departmentRepository.findById(
      DepartmentId.fromString(id),
    );
    if (!department) {
      throw new DepartmentNotFoundError(id);
    }
    return department;
  }

  async listDepartments(workspaceId: string): Promise<Department[]> {
    return this.departmentRepository.findAll(
      WorkspaceId.fromString(workspaceId),
    );
  }

  async updateDepartment(params: {
    id: string;
    workspaceId: string;
    actorId: string;
    name?: string;
    code?: string;
    description?: string | null;
    managerId?: string | null;
    parentDepartmentId?: string | null;
  }): Promise<Department> {
    const workspaceId = WorkspaceId.fromString(params.workspaceId);
    const departmentId = DepartmentId.fromString(params.id);

    if (
      !(await this.workspaceAccess.isAdminOrOwner(
        params.actorId,
        params.workspaceId,
      ))
    ) {
      throw new UnauthorizedAllocationAccessError("update department");
    }

    // Get existing department
    const department = await this.departmentRepository.findById(departmentId);
    if (!department) {
      throw new DepartmentNotFoundError(params.id);
    }

    // Check if code is being changed and if new code already exists
    if (params.code && params.code !== department.getCode()) {
      const existing = await this.departmentRepository.findByCode(
        params.code,
        workspaceId,
      );
      if (existing && existing.getId().getValue() !== params.id) {
        throw new DuplicateDepartmentCodeError(params.code);
      }
    }

    // Update department details
    department.updateDetails({
      name: params.name,
      code: params.code,
      description: params.description,
      managerId: params.managerId
        ? UserId.fromString(params.managerId)
        : params.managerId === null
          ? null
          : undefined,
      parentDepartmentId: params.parentDepartmentId
        ? DepartmentId.fromString(params.parentDepartmentId)
        : params.parentDepartmentId === null
          ? null
          : undefined,
    });

    await this.departmentRepository.save(department);
    return department;
  }

  async deleteDepartment(
    id: string,
    workspaceId: string,
    actorId: string,
  ): Promise<void> {
    if (!(await this.workspaceAccess.isAdminOrOwner(actorId, workspaceId))) {
      throw new UnauthorizedAllocationAccessError("delete department");
    }
    const department = await this.departmentRepository.findById(
      DepartmentId.fromString(id),
    );
    if (!department) {
      throw new DepartmentNotFoundError(id);
    }

    // Soft delete by deactivating
    department.deactivate();
    await this.departmentRepository.save(department);
  }

  async activateDepartment(
    id: string,
    workspaceId: string,
    actorId: string,
  ): Promise<Department> {
    if (!(await this.workspaceAccess.isAdminOrOwner(actorId, workspaceId))) {
      throw new UnauthorizedAllocationAccessError("activate department");
    }
    const department = await this.departmentRepository.findById(
      DepartmentId.fromString(id),
    );
    if (!department) {
      throw new DepartmentNotFoundError(id);
    }

    department.activate();
    await this.departmentRepository.save(department);
    return department;
  }

  // ==========================================
  // Cost Center Management
  // ==========================================

  async createCostCenter(params: {
    workspaceId: string;
    actorId: string;
    name: string;
    code: string;
    description?: string;
  }): Promise<CostCenter> {
    const workspaceId = WorkspaceId.fromString(params.workspaceId);

    if (
      !(await this.workspaceAccess.isAdminOrOwner(
        params.actorId,
        params.workspaceId,
      ))
    ) {
      throw new UnauthorizedAllocationAccessError("create cost center");
    }

    const existing = await this.costCenterRepository.findByCode(
      params.code,
      workspaceId,
    );
    if (existing) {
      throw new DuplicateCostCenterCodeError(params.code);
    }

    const costCenter = CostCenter.create({
      workspaceId,
      name: params.name,
      code: params.code,
      description: params.description,
    });

    await this.costCenterRepository.save(costCenter);
    return costCenter;
  }

  async getCostCenter(id: string): Promise<CostCenter> {
    const costCenter = await this.costCenterRepository.findById(
      CostCenterId.fromString(id),
    );
    if (!costCenter) {
      throw new CostCenterNotFoundError(id);
    }
    return costCenter;
  }

  async listCostCenters(workspaceId: string): Promise<CostCenter[]> {
    return this.costCenterRepository.findAll(
      WorkspaceId.fromString(workspaceId),
    );
  }

  async updateCostCenter(params: {
    id: string;
    workspaceId: string;
    actorId: string;
    name?: string;
    code?: string;
    description?: string | null;
  }): Promise<CostCenter> {
    const workspaceId = WorkspaceId.fromString(params.workspaceId);

    if (
      !(await this.workspaceAccess.isAdminOrOwner(
        params.actorId,
        params.workspaceId,
      ))
    ) {
      throw new UnauthorizedAllocationAccessError("update cost center");
    }
    const costCenterId = CostCenterId.fromString(params.id);

    // Get existing cost center
    const costCenter = await this.costCenterRepository.findById(costCenterId);
    if (!costCenter) {
      throw new CostCenterNotFoundError(params.id);
    }

    // Check if code is being changed and if new code already exists
    if (params.code && params.code !== costCenter.getCode()) {
      const existing = await this.costCenterRepository.findByCode(
        params.code,
        workspaceId,
      );
      if (existing && existing.getId().getValue() !== params.id) {
        throw new DuplicateCostCenterCodeError(params.code);
      }
    }

    // Update cost center details
    costCenter.updateDetails({
      name: params.name,
      code: params.code,
      description: params.description,
    });

    await this.costCenterRepository.save(costCenter);
    return costCenter;
  }

  async deleteCostCenter(
    id: string,
    workspaceId: string,
    actorId: string,
  ): Promise<void> {
    if (!(await this.workspaceAccess.isAdminOrOwner(actorId, workspaceId))) {
      throw new UnauthorizedAllocationAccessError("delete cost center");
    }
    const costCenter = await this.costCenterRepository.findById(
      CostCenterId.fromString(id),
    );
    if (!costCenter) {
      throw new CostCenterNotFoundError(id);
    }

    // Soft delete by deactivating
    costCenter.deactivate();
    await this.costCenterRepository.save(costCenter);
  }

  async activateCostCenter(
    id: string,
    workspaceId: string,
    actorId: string,
  ): Promise<CostCenter> {
    if (!(await this.workspaceAccess.isAdminOrOwner(actorId, workspaceId))) {
      throw new UnauthorizedAllocationAccessError("activate cost center");
    }
    const costCenter = await this.costCenterRepository.findById(
      CostCenterId.fromString(id),
    );
    if (!costCenter) {
      throw new CostCenterNotFoundError(id);
    }

    costCenter.activate();
    await this.costCenterRepository.save(costCenter);
    return costCenter;
  }

  // ==========================================
  // Project Management
  // ==========================================

  async createProject(params: {
    workspaceId: string;
    actorId: string;
    name: string;
    code: string;
    startDate: string | Date;
    description?: string;
    endDate?: string | Date;
    managerId?: string;
    budget?: number;
  }): Promise<Project> {
    const workspaceId = WorkspaceId.fromString(params.workspaceId);

    if (
      !(await this.workspaceAccess.isAdminOrOwner(
        params.actorId,
        params.workspaceId,
      ))
    ) {
      throw new UnauthorizedAllocationAccessError("create project");
    }

    // Check code uniqueness
    const existing = await this.projectRepository.findByCode(
      params.code,
      workspaceId,
    );
    if (existing) {
      throw new DuplicateProjectCodeError(params.code);
    }

    const project = Project.create({
      workspaceId,
      name: params.name,
      code: params.code,
      startDate: new Date(params.startDate),
      description: params.description,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
      managerId: params.managerId
        ? UserId.fromString(params.managerId)
        : undefined,
      budget: params.budget ? new Decimal(params.budget) : undefined,
    });

    await this.projectRepository.save(project);
    return project;
  }

  async getProject(id: string): Promise<Project> {
    const project = await this.projectRepository.findById(
      ProjectId.fromString(id),
    );
    if (!project) {
      throw new ProjectNotFoundError(id);
    }
    return project;
  }

  async listProjects(workspaceId: string): Promise<Project[]> {
    return this.projectRepository.findAll(WorkspaceId.fromString(workspaceId));
  }

  async updateProject(params: {
    id: string;
    workspaceId: string;
    actorId: string;
    name?: string;
    code?: string;
    description?: string | null;
    startDate?: string | Date;
    endDate?: string | Date | null;
    managerId?: string | null;
    budget?: number | null;
  }): Promise<Project> {
    const workspaceId = WorkspaceId.fromString(params.workspaceId);

    if (
      !(await this.workspaceAccess.isAdminOrOwner(
        params.actorId,
        params.workspaceId,
      ))
    ) {
      throw new UnauthorizedAllocationAccessError("update project");
    }
    const projectId = ProjectId.fromString(params.id);

    // Get existing project
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new ProjectNotFoundError(params.id);
    }

    // Check if code is being changed and if new code already exists
    if (params.code && params.code !== project.getCode()) {
      const existing = await this.projectRepository.findByCode(
        params.code,
        workspaceId,
      );
      if (existing && existing.getId().getValue() !== params.id) {
        throw new DuplicateProjectCodeError(params.code);
      }
    }

    // Update project details
    project.updateDetails({
      name: params.name,
      code: params.code,
      description: params.description,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate:
        params.endDate !== undefined
          ? params.endDate === null
            ? null
            : new Date(params.endDate)
          : undefined,
      managerId:
        params.managerId !== undefined
          ? params.managerId === null
            ? null
            : UserId.fromString(params.managerId)
          : undefined,
      budget:
        params.budget !== undefined
          ? params.budget === null
            ? null
            : new Decimal(params.budget)
          : undefined,
    });

    await this.projectRepository.save(project);
    return project;
  }

  async deleteProject(
    id: string,
    workspaceId: string,
    actorId: string,
  ): Promise<void> {
    if (!(await this.workspaceAccess.isAdminOrOwner(actorId, workspaceId))) {
      throw new UnauthorizedAllocationAccessError("delete project");
    }
    const project = await this.projectRepository.findById(
      ProjectId.fromString(id),
    );
    if (!project) {
      throw new ProjectNotFoundError(id);
    }

    // Soft delete by deactivating
    project.deactivate();
    await this.projectRepository.save(project);
  }

  async activateProject(
    id: string,
    workspaceId: string,
    actorId: string,
  ): Promise<Project> {
    if (!(await this.workspaceAccess.isAdminOrOwner(actorId, workspaceId))) {
      throw new UnauthorizedAllocationAccessError("activate project");
    }
    const project = await this.projectRepository.findById(
      ProjectId.fromString(id),
    );
    if (!project) {
      throw new ProjectNotFoundError(id);
    }

    project.activate();
    await this.projectRepository.save(project);
    return project;
  }
}
