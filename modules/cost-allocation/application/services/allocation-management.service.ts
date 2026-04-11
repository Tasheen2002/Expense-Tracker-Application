import { Department, DepartmentDTO } from "../../domain/entities/department.entity";
import { CostCenter, CostCenterDTO } from "../../domain/entities/cost-center.entity";
import { Project, ProjectDTO } from "../../domain/entities/project.entity";
import { DepartmentRepository } from "../../domain/repositories/department.repository";
import { CostCenterRepository } from "../../domain/repositories/cost-center.repository";
import { ProjectRepository } from "../../domain/repositories/project.repository";
import { DepartmentId } from "../../domain/value-objects/department-id";
import { CostCenterId } from "../../domain/value-objects/cost-center-id";
import { ProjectId } from "../../domain/value-objects/project-id";
import { WorkspaceId, UserId } from "../../../identity-workspace";
import {
  DepartmentNotFoundError,
  CostCenterNotFoundError,
  ProjectNotFoundError,
  DuplicateDepartmentCodeError,
  DuplicateCostCenterCodeError,
  DuplicateProjectCodeError,
  UnauthorizedAllocationAccessError,
} from "../../domain/errors/cost-allocation.errors";
import { IWorkspaceAccessPort } from "../ports/workspace-access.port";
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

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
  }): Promise<DepartmentDTO> {
    const workspaceId = WorkspaceId.fromString(params.workspaceId);

    if (
      !(await this.workspaceAccess.isAdminOrOwner(
        params.actorId,
        params.workspaceId,
      ))
    ) {
      throw new UnauthorizedAllocationAccessError("create department");
    }

    const existing = await this.departmentRepository.findByCode(
      params.code,
      workspaceId,
    );
    if (existing) {
      throw new DuplicateDepartmentCodeError(params.code);
    }

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
    return Department.toDTO(department);
  }

  async getDepartment(id: string): Promise<DepartmentDTO> {
    const department = await this.departmentRepository.findById(
      DepartmentId.fromString(id),
    );
    if (!department) {
      throw new DepartmentNotFoundError(id);
    }
    return Department.toDTO(department);
  }

  async listDepartments(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<DepartmentDTO>> {
    const result = await this.departmentRepository.findAll(
      WorkspaceId.fromString(workspaceId),
      options,
    );
    return {
      items: result.items.map(Department.toDTO),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    };
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
  }): Promise<DepartmentDTO> {
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

    const department = await this.departmentRepository.findById(departmentId);
    if (!department) {
      throw new DepartmentNotFoundError(params.id);
    }

    if (params.code && params.code !== department.code) {
      const existing = await this.departmentRepository.findByCode(
        params.code,
        workspaceId,
      );
      if (existing && existing.id.getValue() !== params.id) {
        throw new DuplicateDepartmentCodeError(params.code);
      }
    }

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
    return Department.toDTO(department);
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

    department.deactivate();
    department.markAsDeleted();
    await this.departmentRepository.save(department);
  }

  async activateDepartment(
    id: string,
    workspaceId: string,
    actorId: string,
  ): Promise<DepartmentDTO> {
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
    return Department.toDTO(department);
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
  }): Promise<CostCenterDTO> {
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
    return CostCenter.toDTO(costCenter);
  }

  async getCostCenter(id: string): Promise<CostCenterDTO> {
    const costCenter = await this.costCenterRepository.findById(
      CostCenterId.fromString(id),
    );
    if (!costCenter) {
      throw new CostCenterNotFoundError(id);
    }
    return CostCenter.toDTO(costCenter);
  }

  async listCostCenters(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<CostCenterDTO>> {
    const result = await this.costCenterRepository.findAll(
      WorkspaceId.fromString(workspaceId),
      options,
    );
    return {
      items: result.items.map(CostCenter.toDTO),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    };
  }

  async updateCostCenter(params: {
    id: string;
    workspaceId: string;
    actorId: string;
    name?: string;
    code?: string;
    description?: string | null;
  }): Promise<CostCenterDTO> {
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

    const costCenter = await this.costCenterRepository.findById(costCenterId);
    if (!costCenter) {
      throw new CostCenterNotFoundError(params.id);
    }

    if (params.code && params.code !== costCenter.code) {
      const existing = await this.costCenterRepository.findByCode(
        params.code,
        workspaceId,
      );
      if (existing && existing.id.getValue() !== params.id) {
        throw new DuplicateCostCenterCodeError(params.code);
      }
    }

    costCenter.updateDetails({
      name: params.name,
      code: params.code,
      description: params.description,
    });

    await this.costCenterRepository.save(costCenter);
    return CostCenter.toDTO(costCenter);
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

    costCenter.deactivate();
    costCenter.markAsDeleted();
    await this.costCenterRepository.save(costCenter);
  }

  async activateCostCenter(
    id: string,
    workspaceId: string,
    actorId: string,
  ): Promise<CostCenterDTO> {
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
    return CostCenter.toDTO(costCenter);
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
  }): Promise<ProjectDTO> {
    const workspaceId = WorkspaceId.fromString(params.workspaceId);

    if (
      !(await this.workspaceAccess.isAdminOrOwner(
        params.actorId,
        params.workspaceId,
      ))
    ) {
      throw new UnauthorizedAllocationAccessError("create project");
    }

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
      budget: params.budget ?? null,
    });

    await this.projectRepository.save(project);
    return Project.toDTO(project);
  }

  async getProject(id: string): Promise<ProjectDTO> {
    const project = await this.projectRepository.findById(
      ProjectId.fromString(id),
    );
    if (!project) {
      throw new ProjectNotFoundError(id);
    }
    return Project.toDTO(project);
  }

  async listProjects(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ProjectDTO>> {
    const result = await this.projectRepository.findAll(
      WorkspaceId.fromString(workspaceId),
      options,
    );
    return {
      items: result.items.map(Project.toDTO),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    };
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
  }): Promise<ProjectDTO> {
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

    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new ProjectNotFoundError(params.id);
    }

    if (params.code && params.code !== project.code) {
      const existing = await this.projectRepository.findByCode(
        params.code,
        workspaceId,
      );
      if (existing && existing.id.getValue() !== params.id) {
        throw new DuplicateProjectCodeError(params.code);
      }
    }

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
        params.budget !== undefined ? params.budget : undefined,
    });

    await this.projectRepository.save(project);
    return Project.toDTO(project);
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

    project.deactivate();
    project.markAsDeleted();
    await this.projectRepository.save(project);
  }

  async activateProject(
    id: string,
    workspaceId: string,
    actorId: string,
  ): Promise<ProjectDTO> {
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
    return Project.toDTO(project);
  }
}
