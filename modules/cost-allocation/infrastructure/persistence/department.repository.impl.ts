import { PrismaClient, Prisma } from "@prisma/client";
import { Department } from "../../domain/entities/department.entity";
import { DepartmentRepository } from "../../domain/repositories/department.repository";
import { DepartmentId } from "../../domain/value-objects/department-id";
import { WorkspaceId } from "../../../identity-workspace";
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '../../../../packages/core/src/domain/events/domain-event';

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
        id: department.id.getValue(),
      },
      create: {
        id: department.id.getValue(),
        workspaceId: department.workspaceId.getValue(),
        name: department.name,
        code: department.code,
        description: department.description,
        managerId: department.managerId?.getValue() || null,
        parentDepartmentId: department.parentDepartmentId?.getValue() || null,
        isActive: department.isActive,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
      },
      update: {
        name: department.name,
        code: department.code,
        description: department.description,
        managerId: department.managerId?.getValue() || null,
        parentDepartmentId: department.parentDepartmentId?.getValue() || null,
        isActive: department.isActive,
        updatedAt: department.updatedAt,
      },
    });

    await this.dispatchEvents(department);
  }

  async findById(id: DepartmentId): Promise<Department | null> {
    const data = await this.prisma.department.findUnique({
      where: { id: id.getValue() },
    });

    if (!data) return null;

    return Department.fromPersistence({
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

    return Department.fromPersistence({
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
        Department.fromPersistence({
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
