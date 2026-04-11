import { PrismaClient, Prisma } from "@prisma/client";
import { Project } from "../../domain/entities/project.entity";
import { ProjectRepository } from "../../domain/repositories/project.repository";
import { ProjectId } from "../../domain/value-objects/project-id";
import { WorkspaceId } from "../../../identity-workspace";
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '../../../../packages/core/src/domain/events/domain-event';

export class ProjectRepositoryImpl
  extends PrismaRepository<Project>
  implements ProjectRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(project: Project): Promise<void> {
    await this.prisma.project.upsert({
      where: {
        id: project.id.getValue(),
      },
      create: {
        id: project.id.getValue(),
        workspaceId: project.workspaceId.getValue(),
        name: project.name,
        code: project.code,
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate,
        managerId: project.managerId?.getValue() || null,
        budget: project.budget,
        isActive: project.isActive,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      update: {
        name: project.name,
        code: project.code,
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate,
        managerId: project.managerId?.getValue() || null,
        budget: project.budget,
        isActive: project.isActive,
        updatedAt: project.updatedAt,
      },
    });

    await this.dispatchEvents(project);
  }

  async findById(id: ProjectId): Promise<Project | null> {
    const data = await this.prisma.project.findUnique({
      where: { id: id.getValue() },
    });

    if (!data) return null;

    return Project.fromPersistence({
      id: data.id,
      workspaceId: data.workspaceId,
      name: data.name,
      code: data.code,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      managerId: data.managerId,
      budget: data.budget !== null ? data.budget.toNumber() : null,
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

    return Project.fromPersistence({
      id: data.id,
      workspaceId: data.workspaceId,
      name: data.name,
      code: data.code,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      managerId: data.managerId,
      budget: data.budget !== null ? data.budget.toNumber() : null,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  async findAll(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Project>> {
    const where: Prisma.ProjectWhereInput = {
      workspaceId: workspaceId.getValue(),
    };

    return PrismaRepositoryHelper.paginate(
      this.prisma.project,
      { where },
      (p) =>
        Project.fromPersistence({
          id: p.id,
          workspaceId: p.workspaceId,
          name: p.name,
          code: p.code,
          description: p.description,
          startDate: p.startDate,
          endDate: p.endDate,
          managerId: p.managerId,
          budget: p.budget !== null ? p.budget.toNumber() : null,
          isActive: p.isActive,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        }),
      options,
    );
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
