import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '@shared/response.helper';
import {
  CreateDepartmentHandler,
  UpdateDepartmentHandler,
  DeleteDepartmentHandler,
  ActivateDepartmentHandler,
  GetDepartmentHandler,
  ListDepartmentsHandler,
  CreateCostCenterHandler,
  UpdateCostCenterHandler,
  DeleteCostCenterHandler,
  ActivateCostCenterHandler,
  GetCostCenterHandler,
  ListCostCentersHandler,
  CreateProjectHandler,
  UpdateProjectHandler,
  DeleteProjectHandler,
  ActivateProjectHandler,
  GetProjectHandler,
  ListProjectsHandler,
} from '../../../application';
import {
  WorkspaceParamsInput,
  DepartmentParamsInput,
  CostCenterParamsInput,
  ProjectParamsInput,
  CreateDepartmentInput,
  UpdateDepartmentInput,
  CreateCostCenterInput,
  UpdateCostCenterInput,
  CreateProjectInput,
  UpdateProjectInput,
  PaginationQueryInput,
} from '../validation/cost-allocation.schema';

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

  // ==========================================================================
  // Reads (Queries)
  // ==========================================================================

  // --- Department ---

  async getDepartment(
    request: AuthenticatedRequest<{
      Params: DepartmentParamsInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { departmentId } = request.params;
      const department = await this.getDepartmentHandler.handle({
        id: departmentId,
      });

      return ResponseHelper.ok(reply, 'Department retrieved successfully', department);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listDepartments(
    request: AuthenticatedRequest<{
      Params: WorkspaceParamsInput;
      Querystring: PaginationQueryInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { limit, offset } = request.query;
      const result = await this.listDepartmentsHandler.handle({
        workspaceId,
        limit,
        offset,
      });

      return ResponseHelper.ok(reply, 'Departments retrieved successfully', {
        items: result.items,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  // --- Cost Center ---

  async getCostCenter(
    request: AuthenticatedRequest<{
      Params: CostCenterParamsInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { costCenterId } = request.params;
      const costCenter = await this.getCostCenterHandler.handle({
        id: costCenterId,
      });

      return ResponseHelper.ok(reply, 'Cost Center retrieved successfully', costCenter);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listCostCenters(
    request: AuthenticatedRequest<{
      Params: WorkspaceParamsInput;
      Querystring: PaginationQueryInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { limit, offset } = request.query;
      const result = await this.listCostCentersHandler.handle({
        workspaceId,
        limit,
        offset,
      });

      return ResponseHelper.ok(reply, 'Cost Centers retrieved successfully', {
        items: result.items,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  // --- Project ---

  async getProject(
    request: AuthenticatedRequest<{
      Params: ProjectParamsInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { projectId } = request.params;
      const project = await this.getProjectHandler.handle({ id: projectId });

      return ResponseHelper.ok(reply, 'Project retrieved successfully', project);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listProjects(
    request: AuthenticatedRequest<{
      Params: WorkspaceParamsInput;
      Querystring: PaginationQueryInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { limit, offset } = request.query;
      const result = await this.listProjectsHandler.handle({
        workspaceId,
        limit,
        offset,
      });

      return ResponseHelper.ok(reply, 'Projects retrieved successfully', {
        items: result.items,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  // ==========================================================================
  // Writes (Commands)
  // ==========================================================================

  // --- Department ---

  async createDepartment(
    request: AuthenticatedRequest<{
      Params: WorkspaceParamsInput;
      Body: CreateDepartmentInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId } = request.params;
      const body = request.body;
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
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateDepartment(
    request: AuthenticatedRequest<{
      Params: DepartmentParamsInput;
      Body: UpdateDepartmentInput;
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
        managerId: request.body.managerId ?? undefined,
        parentDepartmentId: request.body.parentDepartmentId ?? undefined,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Department updated successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteDepartment(
    request: AuthenticatedRequest<{
      Params: DepartmentParamsInput;
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

      if (!result.success) {
        return ResponseHelper.fromCommand(reply, result, 'Department deletion failed');
      }

      return reply.status(204).send();
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activateDepartment(
    request: AuthenticatedRequest<{
      Params: DepartmentParamsInput;
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
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  // --- Cost Center ---

  async createCostCenter(
    request: AuthenticatedRequest<{
      Params: WorkspaceParamsInput;
      Body: CreateCostCenterInput;
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
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateCostCenter(
    request: AuthenticatedRequest<{
      Params: CostCenterParamsInput;
      Body: UpdateCostCenterInput;
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
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteCostCenter(
    request: AuthenticatedRequest<{
      Params: CostCenterParamsInput;
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

      if (!result.success) {
        return ResponseHelper.fromCommand(reply, result, 'Cost Center deletion failed');
      }

      return reply.status(204).send();
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activateCostCenter(
    request: AuthenticatedRequest<{
      Params: CostCenterParamsInput;
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
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  // --- Project ---

  async createProject(
    request: AuthenticatedRequest<{
      Params: WorkspaceParamsInput;
      Body: CreateProjectInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId } = request.params;

      const result = await this.createProjectHandler.handle({
        workspaceId,
        actorId: userId,
        name: request.body.name,
        code: request.body.code,
        startDate: request.body.startDate,
        description: request.body.description,
        endDate: request.body.endDate,
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
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateProject(
    request: AuthenticatedRequest<{
      Params: ProjectParamsInput;
      Body: UpdateProjectInput;
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
        endDate: request.body.endDate ?? undefined,
        managerId: request.body.managerId ?? undefined,
        budget: request.body.budget ?? undefined,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Project updated successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteProject(
    request: AuthenticatedRequest<{
      Params: ProjectParamsInput;
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

      if (!result.success) {
        return ResponseHelper.fromCommand(reply, result, 'Project deletion failed');
      }

      return reply.status(204).send();
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activateProject(
    request: AuthenticatedRequest<{
      Params: ProjectParamsInput;
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
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
