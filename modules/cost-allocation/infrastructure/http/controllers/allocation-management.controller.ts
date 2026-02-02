import { FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";
import {
  CreateDepartmentBody,
  UpdateDepartmentBody,
} from "../validation/department.schema";
import {
  CreateCostCenterBody,
  UpdateCostCenterBody,
} from "../validation/cost-center.schema";
import {
  CreateProjectBody,
  UpdateProjectBody,
} from "../validation/project.schema";

// Command Handlers
import {
  CreateDepartmentCommand,
  CreateDepartmentHandler,
} from "../../../application/commands/create-department.command";
import {
  UpdateDepartmentCommand,
  UpdateDepartmentHandler,
} from "../../../application/commands/update-department.command";
import {
  DeleteDepartmentCommand,
  DeleteDepartmentHandler,
} from "../../../application/commands/delete-department.command";
import {
  ActivateDepartmentCommand,
  ActivateDepartmentHandler,
} from "../../../application/commands/activate-department.command";
import {
  CreateCostCenterCommand,
  CreateCostCenterHandler,
} from "../../../application/commands/create-cost-center.command";
import {
  UpdateCostCenterCommand,
  UpdateCostCenterHandler,
} from "../../../application/commands/update-cost-center.command";
import {
  DeleteCostCenterCommand,
  DeleteCostCenterHandler,
} from "../../../application/commands/delete-cost-center.command";
import {
  ActivateCostCenterCommand,
  ActivateCostCenterHandler,
} from "../../../application/commands/activate-cost-center.command";
import {
  CreateProjectCommand,
  CreateProjectHandler,
} from "../../../application/commands/create-project.command";
import {
  UpdateProjectCommand,
  UpdateProjectHandler,
} from "../../../application/commands/update-project.command";
import {
  DeleteProjectCommand,
  DeleteProjectHandler,
} from "../../../application/commands/delete-project.command";
import {
  ActivateProjectCommand,
  ActivateProjectHandler,
} from "../../../application/commands/activate-project.command";

// Query Handlers
import {
  GetDepartmentQuery,
  GetDepartmentHandler,
} from "../../../application/queries/get-department.query";
import {
  ListDepartmentsQuery,
  ListDepartmentsHandler,
} from "../../../application/queries/list-departments.query";
import {
  GetCostCenterQuery,
  GetCostCenterHandler,
} from "../../../application/queries/get-cost-center.query";
import {
  ListCostCentersQuery,
  ListCostCentersHandler,
} from "../../../application/queries/list-cost-centers.query";
import {
  GetProjectQuery,
  GetProjectHandler,
} from "../../../application/queries/get-project.query";
import {
  ListProjectsQuery,
  ListProjectsHandler,
} from "../../../application/queries/list-projects.query";

export class AllocationManagementController {
  constructor(
    private readonly createDepartmentHandler: CreateDepartmentHandler,
    private readonly updateDepartmentHandler: UpdateDepartmentHandler,
    private readonly deleteDepartmentHandler: DeleteDepartmentHandler,
    private readonly activateDepartmentHandler: ActivateDepartmentHandler,
    private readonly getDepartmentHandler: GetDepartmentHandler,
    private readonly listDepartmentsHandler: ListDepartmentsHandler,
    private readonly createCostCenterHandler: CreateCostCenterHandler,
    private readonly updateCostCenterHandler: UpdateCostCenterHandler,
    private readonly deleteCostCenterHandler: DeleteCostCenterHandler,
    private readonly activateCostCenterHandler: ActivateCostCenterHandler,
    private readonly getCostCenterHandler: GetCostCenterHandler,
    private readonly listCostCentersHandler: ListCostCentersHandler,
    private readonly createProjectHandler: CreateProjectHandler,
    private readonly updateProjectHandler: UpdateProjectHandler,
    private readonly deleteProjectHandler: DeleteProjectHandler,
    private readonly activateProjectHandler: ActivateProjectHandler,
    private readonly getProjectHandler: GetProjectHandler,
    private readonly listProjectsHandler: ListProjectsHandler,
  ) {}

  // ==========================================
  // Department
  // ==========================================

  async createDepartment(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: CreateDepartmentBody;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId } = request.params;
      const command = new CreateDepartmentCommand(
        workspaceId,
        userId,
        request.body.name,
        request.body.code,
        request.body.description,
        request.body.managerId,
        request.body.parentDepartmentId,
      );
      const department = await this.createDepartmentHandler.handle(command);

      return ResponseHelper.success(
        reply,
        201,
        "Department created successfully",
        {
          id: department.getId().getValue(),
          name: department.getName(),
          code: department.getCode(),
          description: department.getDescription(),
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listDepartments(
    request: AuthenticatedRequest<{ Params: { workspaceId: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId } = request.params;
      const query = new ListDepartmentsQuery(workspaceId);
      const departments = await this.listDepartmentsHandler.handle(query);

      return ResponseHelper.success(
        reply,
        200,
        "Departments retrieved successfully",
        departments.map((d) => ({
          id: d.getId().getValue(),
          name: d.getName(),
          code: d.getCode(),
          description: d.getDescription(),
          managerId: d.getManagerId()?.getValue(),
          parentDepartmentId: d.getParentDepartmentId()?.getValue(),
          isActive: d.getIsActive(),
        })),
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getDepartment(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; departmentId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;

      const { departmentId } = request.params;
      const query = new GetDepartmentQuery(departmentId);
      const department = await this.getDepartmentHandler.handle(query);

      return ResponseHelper.success(
        reply,
        200,
        "Department retrieved successfully",
        {
          id: department.getId().getValue(),
          name: department.getName(),
          code: department.getCode(),
          description: department.getDescription(),
          managerId: department.getManagerId()?.getValue(),
          parentDepartmentId: department.getParentDepartmentId()?.getValue(),
          isActive: department.getIsActive(),
          createdAt: department.getCreatedAt(),
          updatedAt: department.getUpdatedAt(),
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateDepartment(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; departmentId: string };
      Body: UpdateDepartmentBody;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId, departmentId } = request.params;
      const command = new UpdateDepartmentCommand(
        departmentId,
        workspaceId,
        userId,
        request.body.name,
        request.body.code,
        request.body.description,
        request.body.managerId,
        request.body.parentDepartmentId,
      );
      const department = await this.updateDepartmentHandler.handle(command);

      return ResponseHelper.success(
        reply,
        200,
        "Department updated successfully",
        {
          id: department.getId().getValue(),
          name: department.getName(),
          code: department.getCode(),
          description: department.getDescription(),
          managerId: department.getManagerId()?.getValue(),
          parentDepartmentId: department.getParentDepartmentId()?.getValue(),
          isActive: department.getIsActive(),
          updatedAt: department.getUpdatedAt(),
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteDepartment(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; departmentId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId, departmentId } = request.params;
      const command = new DeleteDepartmentCommand(
        departmentId,
        workspaceId,
        userId,
      );
      await this.deleteDepartmentHandler.handle(command);

      return ResponseHelper.success(
        reply,
        200,
        "Department deleted successfully",
        null,
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activateDepartment(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; departmentId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId, departmentId } = request.params;
      const command = new ActivateDepartmentCommand(
        departmentId,
        workspaceId,
        userId,
      );
      const department = await this.activateDepartmentHandler.handle(command);

      return ResponseHelper.success(
        reply,
        200,
        "Department activated successfully",
        {
          id: department.getId().getValue(),
          name: department.getName(),
          code: department.getCode(),
          description: department.getDescription(),
          workspaceId: department.getWorkspaceId().getValue(),
          managerId: department.getManagerId()?.getValue(),
          parentDepartmentId: department.getParentDepartmentId()?.getValue(),
          isActive: department.getIsActive(),
          createdAt: department.getCreatedAt(),
          updatedAt: department.getUpdatedAt(),
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  // ==========================================
  // Cost Center
  // ==========================================

  async createCostCenter(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: CreateCostCenterBody;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId } = request.params;
      const command = new CreateCostCenterCommand(
        workspaceId,
        userId,
        request.body.name,
        request.body.code,
        request.body.description,
      );
      const costCenter = await this.createCostCenterHandler.handle(command);

      return ResponseHelper.success(
        reply,
        201,
        "Cost Center created successfully",
        {
          id: costCenter.getId().getValue(),
          name: costCenter.getName(),
          code: costCenter.getCode(),
          description: costCenter.getDescription(),
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listCostCenters(
    request: AuthenticatedRequest<{ Params: { workspaceId: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId } = request.params;
      const query = new ListCostCentersQuery(workspaceId);
      const costCenters = await this.listCostCentersHandler.handle(query);

      return ResponseHelper.success(
        reply,
        200,
        "Cost Centers retrieved successfully",
        costCenters.map((c) => ({
          id: c.getId().getValue(),
          name: c.getName(),
          code: c.getCode(),
          description: c.getDescription(),
          isActive: c.getIsActive(),
        })),
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getCostCenter(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; costCenterId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;

      const { costCenterId } = request.params;
      const query = new GetCostCenterQuery(costCenterId);
      const costCenter = await this.getCostCenterHandler.handle(query);

      return ResponseHelper.success(
        reply,
        200,
        "Cost Center retrieved successfully",
        {
          id: costCenter.getId().getValue(),
          name: costCenter.getName(),
          code: costCenter.getCode(),
          description: costCenter.getDescription(),
          isActive: costCenter.getIsActive(),
          createdAt: costCenter.getCreatedAt(),
          updatedAt: costCenter.getUpdatedAt(),
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateCostCenter(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; costCenterId: string };
      Body: UpdateCostCenterBody;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId, costCenterId } = request.params;
      const command = new UpdateCostCenterCommand(
        costCenterId,
        workspaceId,
        userId,
        request.body.name,
        request.body.code,
        request.body.description,
      );
      const costCenter = await this.updateCostCenterHandler.handle(command);

      return ResponseHelper.success(
        reply,
        200,
        "Cost Center updated successfully",
        {
          id: costCenter.getId().getValue(),
          name: costCenter.getName(),
          code: costCenter.getCode(),
          description: costCenter.getDescription(),
          isActive: costCenter.getIsActive(),
          updatedAt: costCenter.getUpdatedAt(),
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteCostCenter(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; costCenterId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId, costCenterId } = request.params;
      const command = new DeleteCostCenterCommand(
        costCenterId,
        workspaceId,
        userId,
      );
      await this.deleteCostCenterHandler.handle(command);

      return ResponseHelper.success(
        reply,
        200,
        "Cost Center deleted successfully",
        null,
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activateCostCenter(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; costCenterId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId, costCenterId } = request.params;
      const command = new ActivateCostCenterCommand(
        costCenterId,
        workspaceId,
        userId,
      );
      const costCenter = await this.activateCostCenterHandler.handle(command);

      return ResponseHelper.success(
        reply,
        200,
        "Cost Center activated successfully",
        {
          id: costCenter.getId().getValue(),
          name: costCenter.getName(),
          code: costCenter.getCode(),
          description: costCenter.getDescription(),
          isActive: costCenter.getIsActive(),
          updatedAt: costCenter.getUpdatedAt(),
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  // ==========================================
  // Project
  // ==========================================

  async createProject(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: CreateProjectBody;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId } = request.params;

      // Handle potential date parsing if raw JSON comes as strings
      const startDate = new Date(request.body.startDate);
      const endDate = request.body.endDate
        ? new Date(request.body.endDate)
        : undefined;

      const command = new CreateProjectCommand(
        workspaceId,
        userId,
        request.body.name,
        request.body.code,
        startDate,
        request.body.description,
        endDate,
        request.body.managerId,
        request.body.budget,
      );
      const project = await this.createProjectHandler.handle(command);

      return ResponseHelper.success(
        reply,
        201,
        "Project created successfully",
        {
          id: project.getId().getValue(),
          name: project.getName(),
          code: project.getCode(),
          description: project.getDescription(),
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listProjects(
    request: AuthenticatedRequest<{ Params: { workspaceId: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId } = request.params;
      const query = new ListProjectsQuery(workspaceId);
      const projects = await this.listProjectsHandler.handle(query);

      return ResponseHelper.success(
        reply,
        200,
        "Projects retrieved successfully",
        projects.map((p) => ({
          id: p.getId().getValue(),
          name: p.getName(),
          code: p.getCode(),
          description: p.getDescription(),
          startDate: p.getStartDate(),
          endDate: p.getEndDate(),
          managerId: p.getManagerId()?.getValue(),
          budget: p.getBudget(),
          isActive: p.getIsActive(),
        })),
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getProject(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; projectId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;

      const { projectId } = request.params;
      const query = new GetProjectQuery(projectId);
      const project = await this.getProjectHandler.handle(query);

      return ResponseHelper.success(
        reply,
        200,
        "Project retrieved successfully",
        {
          id: project.getId().getValue(),
          name: project.getName(),
          code: project.getCode(),
          description: project.getDescription(),
          startDate: project.getStartDate(),
          endDate: project.getEndDate(),
          managerId: project.getManagerId()?.getValue(),
          budget: project.getBudget()?.toNumber(),
          isActive: project.getIsActive(),
          createdAt: project.getCreatedAt(),
          updatedAt: project.getUpdatedAt(),
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateProject(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; projectId: string };
      Body: UpdateProjectBody;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId, projectId } = request.params;
      const command = new UpdateProjectCommand(
        projectId,
        workspaceId,
        userId,
        request.body.name,
        request.body.code,
        request.body.description,
        request.body.startDate,
        request.body.endDate,
        request.body.managerId,
        request.body.budget,
      );
      const project = await this.updateProjectHandler.handle(command);

      return ResponseHelper.success(
        reply,
        200,
        "Project updated successfully",
        {
          id: project.getId().getValue(),
          name: project.getName(),
          code: project.getCode(),
          description: project.getDescription(),
          startDate: project.getStartDate(),
          endDate: project.getEndDate(),
          managerId: project.getManagerId()?.getValue(),
          budget: project.getBudget()?.toNumber(),
          isActive: project.getIsActive(),
          updatedAt: project.getUpdatedAt(),
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteProject(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; projectId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId, projectId } = request.params;
      const command = new DeleteProjectCommand(projectId, workspaceId, userId);
      await this.deleteProjectHandler.handle(command);

      return ResponseHelper.success(
        reply,
        200,
        "Project deleted successfully",
        null,
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activateProject(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; projectId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId, projectId } = request.params;
      const command = new ActivateProjectCommand(
        projectId,
        workspaceId,
        userId,
      );
      const project = await this.activateProjectHandler.handle(command);

      return ResponseHelper.success(
        reply,
        200,
        "Project activated successfully",
        {
          id: project.getId().getValue(),
          name: project.getName(),
          code: project.getCode(),
          description: project.getDescription(),
          workspaceId: project.getWorkspaceId().getValue(),
          startDate: project.getStartDate(),
          endDate: project.getEndDate(),
          managerId: project.getManagerId()?.getValue(),
          budget: project.getBudget()?.toNumber(),
          isActive: project.getIsActive(),
          createdAt: project.getCreatedAt(),
          updatedAt: project.getUpdatedAt(),
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
