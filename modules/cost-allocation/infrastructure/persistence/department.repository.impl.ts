import { PrismaClient, Prisma } from "@prisma/client";
import { Department } from "../../domain/entities/department.entity";
import { DepartmentRepository } from "../../domain/repositories/department.repository";
import { DepartmentId } from "../../domain/value-objects/department-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PrismaRepositoryHelper } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper";
import { PrismaRepository } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.base";
import { IEventBus } from "../../../../apps/api/src/shared/domain/events/domain-event";

export class DepartmentRepositoryImpl
  extends PrismaRepository<Department>
  implements DepartmentRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(department: Department): Promise<void> {
    await this.prisma.department.upsert({
      where: {
        id: department.getId().getValue(),
      },
      create: {
        id: department.getId().getValue(),
        workspaceId: department.getWorkspaceId().getValue(),
        name: department.getName(),
        code: department.getCode(),
        description: department.getDescription(),
        managerId: department.getManagerId()?.getValue() || null,
        parentDepartmentId:
          department.getParentDepartmentId()?.getValue() || null,
        isActive: department.getIsActive(),
        createdAt: department.getCreatedAt(),
        updatedAt: department.getUpdatedAt(),
      },
      update: {
        name: department.getName(),
        code: department.getCode(),
        description: department.getDescription(),
        managerId: department.getManagerId()?.getValue() || null,
        parentDepartmentId:
          department.getParentDepartmentId()?.getValue() || null,
        isActive: department.getIsActive(),
        updatedAt: department.getUpdatedAt(),
      },
    });

    await this.dispatchEvents(department);
  }

  async findById(id: DepartmentId): Promise<Department | null> {
    const data = await this.prisma.department.findUnique({
      where: { id: id.getValue() },
    });

    if (!data) return null;

    return Department.reconstitute({
      id: data.id,
      workspaceId: data.workspaceId,
      name: data.name,
      code: data.code,
      description: data.description,
      managerId: data.managerId,
      parentDepartmentId: data.parentDepartmentId,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  async findByCode(
    code: string,
    workspaceId: WorkspaceId,
  ): Promise<Department | null> {
    const data = await this.prisma.department.findFirst({
      where: {
        workspaceId: workspaceId.getValue(),
        code: code,
      },
    });

    if (!data) return null;

    return Department.reconstitute({
      id: data.id,
      workspaceId: data.workspaceId,
      name: data.name,
      code: data.code,
      description: data.description,
      managerId: data.managerId,
      parentDepartmentId: data.parentDepartmentId,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  async findAll(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Department>> {
    const where: Prisma.DepartmentWhereInput = {
      workspaceId: workspaceId.getValue(),
    };

    return PrismaRepositoryHelper.paginate(
      this.prisma.department,
      { where },
      (d) =>
        Department.reconstitute({
          id: d.id,
          workspaceId: d.workspaceId,
          name: d.name,
          code: d.code,
          description: d.description,
          managerId: d.managerId,
          parentDepartmentId: d.parentDepartmentId,
          isActive: d.isActive,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        }),
      options,
    );
  }

  async delete(id: DepartmentId, workspaceId: WorkspaceId): Promise<void> {
    await this.prisma.department.delete({
      where: {
        id: id.getValue(),
        workspaceId: workspaceId.getValue(),
      },
    });
  }
}
