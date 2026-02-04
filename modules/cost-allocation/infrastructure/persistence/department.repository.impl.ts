import { PrismaClient } from "@prisma/client";
import { Department } from "../../domain/entities/department.entity";
import { DepartmentRepository } from "../../domain/repositories/department.repository";
import { DepartmentId } from "../../domain/value-objects/department-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export class DepartmentRepositoryImpl implements DepartmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

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
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const where = { workspaceId: workspaceId.getValue() };

    const [data, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        take: limit,
        skip: offset,
      }),
      this.prisma.department.count({ where }),
    ]);

    const items = data.map((d) =>
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
    );

    return {
      items,
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    };
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
