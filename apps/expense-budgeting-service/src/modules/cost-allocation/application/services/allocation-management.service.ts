import { Department, DepartmentDTO } from "../../domain/entities/department.entity";
import { CostCenter, CostCenterDTO } from "../../domain/entities/cost-center.entity";
import { Project, ProjectDTO } from "../../domain/entities/project.entity";
import { IDepartmentRepository } from "../../domain/repositories/department.repository";
import { ICostCenterRepository } from "../../domain/repositories/cost-center.repository";
import { IProjectRepository } from "../../domain/repositories/project.repository";
import { DepartmentId } from "../../domain/value-objects/department-id";
import { CostCenterId } from "../../domain/value-objects/cost-center-id";
import { ProjectId } from "../../domain/value-objects/project-id";
import { DepartmentCode } from "../../domain/value-objects/department-code";
import { CostCenterCode } from "../../domain/value-objects/cost-center-code";
import { ProjectCode } from "../../domain/value-objects/project-code";
import {  WorkspaceId, UserId  } from '@core/domain/value-objects';
import {
  DepartmentNotFoundError,
  CostCenterNotFoundError,
  ProjectNotFoundError,
  DuplicateDepartmentCodeError,
  DuplicateCostCenterCodeError,
  DuplicateProjectCodeError,
  UnauthorizedAllocationAccessError,
  InvalidDepartmentHierarchyError,
} from "../../domain/errors/cost-allocation.errors";
import { IWorkspaceAccessPort } from "../ports/workspace-access.port";
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export class AllocationManagementService {
  constructor(
    private readonly departmentRepository: IDepartmentRepository,
    private readonly costCenterRepository: ICostCenterRepository,
    private readonly projectRepository: IProjectRepository,
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

    await this.authorizeWrite(params.actorId, params.workspaceId, 'create department');

    const code = DepartmentCode.create(params.code).value;
    const existing = await this.departmentRepository.findByCode(
      code,
      workspaceId,
    );
    if (existing) {
      throw new DuplicateDepartmentCodeError(params.code);
    }
    if (params.parentDepartmentId) {
      await this.validateDepartmentParent(params.parentDepartmentId, workspaceId);
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

  async getDepartment(id: string, workspaceId: string, actorId: string): Promise<DepartmentDTO> {
    await this.authorizeRead(actorId, workspaceId);
    const department = await this.departmentRepository.findById(
      DepartmentId.fromString(id),
      WorkspaceId.fromString(workspaceId),
    );
    if (!department) {
      throw new DepartmentNotFoundError(id);
    }
    return Department.toDTO(department);
  }

  async listDepartments(
    workspaceId: string,
    actorId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<DepartmentDTO>> {
    await this.authorizeRead(actorId, workspaceId);
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

    await this.authorizeWrite(params.actorId, params.workspaceId, 'update department');

    const department = await this.departmentRepository.findById(departmentId, workspaceId);
    if (!department) {
      throw new DepartmentNotFoundError(params.id);
    }

    const code = params.code === undefined ? undefined : DepartmentCode.create(params.code).value;
    if (code && code !== department.code) {
      const existing = await this.departmentRepository.findByCode(
        code,
        workspaceId,
      );
      if (existing && existing.id.getValue() !== params.id) {
        throw new DuplicateDepartmentCodeError(code);
      }
    }
    if (params.parentDepartmentId) {
      await this.validateDepartmentParent(params.parentDepartmentId, workspaceId, params.id);
    }

    department.updateDetails({
      name: params.name,
      code,
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
    await this.authorizeWrite(actorId, workspaceId, 'delete department');
    const department = await this.departmentRepository.findById(
      DepartmentId.fromString(id),
      WorkspaceId.fromString(workspaceId),
    );
    if (!department) {
      throw new DepartmentNotFoundError(id);
    }

    if (!department.isActive) return;
    department.deactivate();
    await this.departmentRepository.save(department);
  }

  async activateDepartment(
    id: string,
    workspaceId: string,
    actorId: string,
  ): Promise<DepartmentDTO> {
    await this.authorizeWrite(actorId, workspaceId, 'activate department');
    const department = await this.departmentRepository.findById(
      DepartmentId.fromString(id),
      WorkspaceId.fromString(workspaceId),
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

    await this.authorizeWrite(params.actorId, params.workspaceId, 'create cost center');

    const code = CostCenterCode.create(params.code).value;
    const existing = await this.costCenterRepository.findByCode(
      code,
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

  async getCostCenter(id: string, workspaceId: string, actorId: string): Promise<CostCenterDTO> {
    await this.authorizeRead(actorId, workspaceId);
    const costCenter = await this.costCenterRepository.findById(
      CostCenterId.fromString(id),
      WorkspaceId.fromString(workspaceId),
    );
    if (!costCenter) {
      throw new CostCenterNotFoundError(id);
    }
    return CostCenter.toDTO(costCenter);
  }

  async listCostCenters(
    workspaceId: string,
    actorId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<CostCenterDTO>> {
    await this.authorizeRead(actorId, workspaceId);
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

    await this.authorizeWrite(params.actorId, params.workspaceId, 'update cost center');
    const costCenterId = CostCenterId.fromString(params.id);

    const costCenter = await this.costCenterRepository.findById(costCenterId, workspaceId);
    if (!costCenter) {
      throw new CostCenterNotFoundError(params.id);
    }

    const code = params.code === undefined ? undefined : CostCenterCode.create(params.code).value;
    if (code && code !== costCenter.code) {
      const existing = await this.costCenterRepository.findByCode(
        code,
        workspaceId,
      );
      if (existing && existing.id.getValue() !== params.id) {
        throw new DuplicateCostCenterCodeError(code);
      }
    }

    costCenter.updateDetails({
      name: params.name,
      code,
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
    await this.authorizeWrite(actorId, workspaceId, 'delete cost center');
    const costCenter = await this.costCenterRepository.findById(
      CostCenterId.fromString(id),
      WorkspaceId.fromString(workspaceId),
    );
    if (!costCenter) {
      throw new CostCenterNotFoundError(id);
    }

    if (!costCenter.isActive) return;
    costCenter.deactivate();
    await this.costCenterRepository.save(costCenter);
  }

  async activateCostCenter(
    id: string,
    workspaceId: string,
    actorId: string,
  ): Promise<CostCenterDTO> {
    await this.authorizeWrite(actorId, workspaceId, 'activate cost center');
    const costCenter = await this.costCenterRepository.findById(
      CostCenterId.fromString(id),
      WorkspaceId.fromString(workspaceId),
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

    await this.authorizeWrite(params.actorId, params.workspaceId, 'create project');

    const code = ProjectCode.create(params.code).value;
    const existing = await this.projectRepository.findByCode(
      code,
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

  async getProject(id: string, workspaceId: string, actorId: string): Promise<ProjectDTO> {
    await this.authorizeRead(actorId, workspaceId);
    const project = await this.projectRepository.findById(
      ProjectId.fromString(id),
      WorkspaceId.fromString(workspaceId),
    );
    if (!project) {
      throw new ProjectNotFoundError(id);
    }
    return Project.toDTO(project);
  }

  async listProjects(
    workspaceId: string,
    actorId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ProjectDTO>> {
    await this.authorizeRead(actorId, workspaceId);
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

    await this.authorizeWrite(params.actorId, params.workspaceId, 'update project');
    const projectId = ProjectId.fromString(params.id);

    const project = await this.projectRepository.findById(projectId, workspaceId);
    if (!project) {
      throw new ProjectNotFoundError(params.id);
    }

    const code = params.code === undefined ? undefined : ProjectCode.create(params.code).value;
    if (code && code !== project.code) {
      const existing = await this.projectRepository.findByCode(
        code,
        workspaceId,
      );
      if (existing && existing.id.getValue() !== params.id) {
        throw new DuplicateProjectCodeError(code);
      }
    }

    project.updateDetails({
      name: params.name,
      code,
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
    await this.authorizeWrite(actorId, workspaceId, 'delete project');
    const project = await this.projectRepository.findById(
      ProjectId.fromString(id),
      WorkspaceId.fromString(workspaceId),
    );
    if (!project) {
      throw new ProjectNotFoundError(id);
    }

    if (!project.isActive) return;
    project.deactivate();
    await this.projectRepository.save(project);
  }

  async activateProject(
    id: string,
    workspaceId: string,
    actorId: string,
  ): Promise<ProjectDTO> {
    await this.authorizeWrite(actorId, workspaceId, 'activate project');
    const project = await this.projectRepository.findById(
      ProjectId.fromString(id),
      WorkspaceId.fromString(workspaceId),
    );
    if (!project) {
      throw new ProjectNotFoundError(id);
    }

    project.activate();
    await this.projectRepository.save(project);
    return Project.toDTO(project);
  }

  private async authorizeWrite(actorId: string, workspaceId: string, action: string): Promise<void> {
    if (!(await this.workspaceAccess.isAdminOrOwner(actorId, workspaceId))) {
      throw new UnauthorizedAllocationAccessError(action);
    }
  }

  private async authorizeRead(actorId: string, workspaceId: string): Promise<void> {
    if (!(await this.workspaceAccess.isMember(actorId, workspaceId))) {
      throw new UnauthorizedAllocationAccessError('view allocation targets');
    }
  }

  private async validateDepartmentParent(
    parentId: string,
    workspaceId: WorkspaceId,
    departmentId?: string,
  ): Promise<void> {
    const visited = new Set<string>();
    let currentId: string | null = parentId;
    while (currentId) {
      if (currentId === departmentId || visited.has(currentId)) {
        throw new InvalidDepartmentHierarchyError('parent would create a cycle');
      }
      visited.add(currentId);
      const parent: Department | null = await this.departmentRepository.findById(
        DepartmentId.fromString(currentId), workspaceId,
      );
      if (!parent || !parent.isActive) {
        throw new InvalidDepartmentHierarchyError('parent must be active in the same workspace');
      }
      currentId = parent.parentDepartmentId?.getValue() ?? null;
    }
  }
}
