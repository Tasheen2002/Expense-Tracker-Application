import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';

interface CreateDepartmentBody {
  name: string;
  code: string;
  description?: string;
  managerId?: string;
  parentDepartmentId?: string;
}

interface UpdateDepartmentBody {
  name?: string;
  code?: string;
  description?: string | null;
  managerId?: string | null;
  parentDepartmentId?: string | null;
}

interface CreateCostCenterBody {
  name: string;
  code: string;
  description?: string;
}

interface UpdateCostCenterBody {
  name?: string;
  code?: string;
  description?: string | null;
}

interface CreateProjectBody {
  name: string;
  code: string;
  startDate: string | Date;
  description?: string;
  endDate?: string | Date;
  managerId?: string;
  budget?: number;
}

interface UpdateProjectBody {
  name?: string;
  code?: string;
  description?: string | null;
  startDate?: Date;
  endDate?: Date | null;
  managerId?: string | null;
  budget?: number | null;
}

// Command Handlers
import { CreateDepartmentHandler } from '../../../application/commands/create-department.command';
import { UpdateDepartmentHandler } from '../../../application/commands/update-department.command';
import { DeleteDepartmentHandler } from '../../../application/commands/delete-department.command';
import { ActivateDepartmentHandler } from '../../../application/commands/activate-department.command';
import { CreateCostCenterHandler } from '../../../application/commands/create-cost-center.command';
import { UpdateCostCenterHandler } from '../../../application/commands/update-cost-center.command';
import { DeleteCostCenterHandler } from '../../../application/commands/delete-cost-center.command';
import { ActivateCostCenterHandler } from '../../../application/commands/activate-cost-center.command';
import { CreateProjectHandler } from '../../../application/commands/create-project.command';
import { UpdateProjectHandler } from '../../../application/commands/update-project.command';
import { DeleteProjectHandler } from '../../../application/commands/delete-project.command';
import { ActivateProjectHandler } from '../../../application/commands/activate-project.command';

// Query Handlers
import { GetDepartmentHandler } from '../../../application/queries/get-department.query';
import { ListDepartmentsHandler } from '../../../application/queries/list-departments.query';
import { GetCostCenterHandler } from '../../../application/queries/get-cost-center.query';
import { ListCostCentersHandler } from '../../../application/queries/list-cost-centers.query';
import { GetProjectHandler } from '../../../application/queries/get-project.query';
import { ListProjectsHandler } from '../../../application/queries/list-projects.query';

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
    private readonly listProjectsHandler: ListProjectsHandler
  ) {}

  // ==========================================
  // Department
  // ==========================================

  async createDepartment(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const userId = request.user.userId;

      const { workspaceId } = request.params as { workspaceId: string };
      const body = request.body as {
        name: string;
        code: string;
        description?: string;
        managerId?: string;
        parentDepartmentId?: string;
      };
      const result = await this.createDepartmentHandler.handle({
        workspaceId,
        actorId: userId,
        name: body.name,
        code: body.code,
        description: body.description,
        managerId: body.managerId,
        parentDepartmentId: body.parentDepartmentId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Department created successfully',
        result.data,
        201
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listDepartments(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const userId = request.user.userId;

      const { workspaceId } = request.params as { workspaceId: string };
      const { limit, offset } = request.query as {
        limit?: string;
        offset?: string;
      };
      const result = await this.listDepartmentsHandler.handle({
        workspaceId,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Departments retrieved successfully',
        {
          items: result.data?.items.map((d) => d.toJSON()) || [],
          pagination: {
            total: result.data?.total || 0,
            limit: result.data?.limit || 50,
            offset: result.data?.offset || 0,
            hasMore: result.data?.hasMore || false,
          },
        }
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getDepartment(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; departmentId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;

      const { departmentId } = request.params;
      const result = await this.getDepartmentHandler.handle({
        id: departmentId,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Department retrieved successfully',
        result.data?.toJSON()
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
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId, departmentId } = request.params;
      const result = await this.updateDepartmentHandler.handle({
        id: departmentId,
        workspaceId,
        actorId: userId,
        name: request.body.name,
        code: request.body.code,
        description: request.body.description,
        managerId: request.body.managerId,
        parentDepartmentId: request.body.parentDepartmentId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Department updated successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteDepartment(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; departmentId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId, departmentId } = request.params;
      const result = await this.deleteDepartmentHandler.handle({
        id: departmentId,
        workspaceId,
        actorId: userId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Department deleted successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activateDepartment(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; departmentId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId, departmentId } = request.params;
      const result = await this.activateDepartmentHandler.handle({
        id: departmentId,
        workspaceId,
        actorId: userId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Department activated successfully'
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
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId } = request.params;
      const result = await this.createCostCenterHandler.handle({
        workspaceId,
        actorId: userId,
        name: request.body.name,
        code: request.body.code,
        description: request.body.description,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Cost Center created successfully',
        result.data,
        201
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listCostCenters(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { limit?: string; offset?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId } = request.params;
      const { limit, offset } = request.query;
      const result = await this.listCostCentersHandler.handle({
        workspaceId,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Cost Centers retrieved successfully',
        {
          items: result.data?.items.map((c) => c.toJSON()) || [],
          pagination: {
            total: result.data?.total || 0,
            limit: result.data?.limit || 50,
            offset: result.data?.offset || 0,
            hasMore: result.data?.hasMore || false,
          },
        }
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getCostCenter(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; costCenterId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;

      const { costCenterId } = request.params;
      const result = await this.getCostCenterHandler.handle({
        id: costCenterId,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Cost Center retrieved successfully',
        result.data?.toJSON()
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
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId, costCenterId } = request.params;
      const result = await this.updateCostCenterHandler.handle({
        id: costCenterId,
        workspaceId,
        actorId: userId,
        name: request.body.name,
        code: request.body.code,
        description: request.body.description,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Cost Center updated successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteCostCenter(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; costCenterId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId, costCenterId } = request.params;
      const result = await this.deleteCostCenterHandler.handle({
        id: costCenterId,
        workspaceId,
        actorId: userId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Cost Center deleted successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activateCostCenter(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; costCenterId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId, costCenterId } = request.params;
      const result = await this.activateCostCenterHandler.handle({
        id: costCenterId,
        workspaceId,
        actorId: userId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Cost Center activated successfully'
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
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId } = request.params;

      // Handle potential date parsing if raw JSON comes as strings
      const startDate = new Date(request.body.startDate);
      const endDate = request.body.endDate
        ? new Date(request.body.endDate)
        : undefined;

      const result = await this.createProjectHandler.handle({
        workspaceId,
        actorId: userId,
        name: request.body.name,
        code: request.body.code,
        startDate,
        description: request.body.description,
        endDate,
        managerId: request.body.managerId,
        budget: request.body.budget,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Project created successfully',
        result.data,
        201
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listProjects(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { limit?: string; offset?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId } = request.params;
      const { limit, offset } = request.query;
      const result = await this.listProjectsHandler.handle({
        workspaceId,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Projects retrieved successfully',
        {
          items: result.data?.items.map((p) => p.toJSON()) || [],
          pagination: {
            total: result.data?.total || 0,
            limit: result.data?.limit || 50,
            offset: result.data?.offset || 0,
            hasMore: result.data?.hasMore || false,
          },
        }
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getProject(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; projectId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;

      const { projectId } = request.params;
      const result = await this.getProjectHandler.handle({ id: projectId });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Project retrieved successfully',
        result.data?.toJSON()
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
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId, projectId } = request.params;
      const result = await this.updateProjectHandler.handle({
        id: projectId,
        workspaceId,
        actorId: userId,
        name: request.body.name,
        code: request.body.code,
        description: request.body.description,
        startDate: request.body.startDate,
        endDate: request.body.endDate,
        managerId: request.body.managerId,
        budget: request.body.budget,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Project updated successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteProject(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; projectId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId, projectId } = request.params;
      const result = await this.deleteProjectHandler.handle({
        id: projectId,
        workspaceId,
        actorId: userId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Project deleted successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activateProject(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; projectId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId, projectId } = request.params;
      const result = await this.activateProjectHandler.handle({
        id: projectId,
        workspaceId,
        actorId: userId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Project activated successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
