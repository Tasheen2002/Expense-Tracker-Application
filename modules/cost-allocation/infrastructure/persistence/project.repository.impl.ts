import { PrismaClient } from "@prisma/client";
import { Project } from "../../domain/entities/project.entity";
import { ProjectRepository } from "../../domain/repositories/project.repository";
import { ProjectId } from "../../domain/value-objects/project-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PaginationOptions } from "../../../../apps/api/src/shared/domain/interfaces/pagination-options.interface";

export class ProjectRepositoryImpl implements ProjectRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(project: Project): Promise<void> {
    await this.prisma.project.upsert({
      where: {
        id: project.getId().getValue(),
      },
      create: {
        id: project.getId().getValue(),
        workspaceId: project.getWorkspaceId().getValue(),
        name: project.getName(),
        code: project.getCode(),
        description: project.getDescription(),
        startDate: project.getStartDate(),
        endDate: project.getEndDate(),
        managerId: project.getManagerId()?.getValue() || null,
        budget: project.getBudget(),
        isActive: project.getIsActive(),
        createdAt: project.getCreatedAt(),
        updatedAt: project.getUpdatedAt(),
      },
      update: {
        name: project.getName(),
        code: project.getCode(),
        description: project.getDescription(),
        startDate: project.getStartDate(),
        endDate: project.getEndDate(),
        managerId: project.getManagerId()?.getValue() || null,
        budget: project.getBudget(),
        isActive: project.getIsActive(),
        updatedAt: project.getUpdatedAt(),
      },
    });
  }

  async findById(id: ProjectId): Promise<Project | null> {
    const data = await this.prisma.project.findUnique({
      where: { id: id.getValue() },
    });

    if (!data) return null;

    return Project.reconstitute({
      id: data.id,
      workspaceId: data.workspaceId,
      name: data.name,
      code: data.code,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      managerId: data.managerId,
      budget: data.budget,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  async findByCode(
    code: string,
    workspaceId: WorkspaceId,
  ): Promise<Project | null> {
    const data = await this.prisma.project.findFirst({
      where: {
        workspaceId: workspaceId.getValue(),
        code: code,
      },
    });

    if (!data) return null;

    return Project.reconstitute({
      id: data.id,
      workspaceId: data.workspaceId,
      name: data.name,
      code: data.code,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      managerId: data.managerId,
      budget: data.budget,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  async findAll(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Project>> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const where = { workspaceId: workspaceId.getValue() };

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        take: limit,
        skip: offset,
      }),
      this.prisma.project.count({ where }),
    ]);

    const items = data.map((p) =>
      Project.reconstitute({
        id: p.id,
        workspaceId: p.workspaceId,
        name: p.name,
        code: p.code,
        description: p.description,
        startDate: p.startDate,
        endDate: p.endDate,
        managerId: p.managerId,
        budget: p.budget,
        isActive: p.isActive,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
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

  async delete(id: ProjectId, workspaceId: WorkspaceId): Promise<void> {
    await this.prisma.project.delete({
      where: {
        id: id.getValue(),
        workspaceId: workspaceId.getValue(),
      },
    });
  }
}
