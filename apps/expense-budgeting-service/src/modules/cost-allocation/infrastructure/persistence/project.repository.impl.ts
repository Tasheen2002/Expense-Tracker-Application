import { PrismaClient, Prisma } from '@prisma/client';
import { Project } from '../../domain/entities/project.entity';
import { IProjectRepository } from '../../domain/repositories/project.repository';
import { ProjectId } from '../../domain/value-objects/project-id';
import { WorkspaceId } from '@core/domain/value-objects';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '@core/domain/events/domain-event';
import { managementOrderBy } from './management-order';
import { isWorkspaceCodeConflict } from './management-constraint';
import {
  DuplicateProjectCodeError,
  ManagementConcurrencyConflictError,
} from '../../domain/errors/cost-allocation.errors';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';

export class ProjectRepositoryImpl
  extends PrismaRepository<Project>
  implements IProjectRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(project: Project): Promise<void> {
    try {
      await this.runInTransaction(async (tx) => {
        const id = project.id.getValue();
        const workspaceId = project.workspaceId.getValue();
        const existing = await tx.project.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!existing) {
          await tx.project.create({
            data: {
              id,
              workspaceId,
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
              version: project.version,
            },
          });
        } else {
          const updated = await tx.project.updateMany({
            where: { id, workspaceId, version: project.version },
            data: {
              name: project.name,
              code: project.code,
              description: project.description,
              startDate: project.startDate,
              endDate: project.endDate,
              managerId: project.managerId?.getValue() || null,
              budget: project.budget,
              isActive: project.isActive,
              updatedAt: project.updatedAt,
              version: { increment: 1 },
            },
          });
          if (updated.count !== 1) {
            throw new ManagementConcurrencyConflictError('Project', id);
          }
          const previousVersion = project.version;
          project.synchronizeVersion(previousVersion + 1);
          PrismaUnitOfWork.addRollbackHook(() =>
            project.synchronizeVersion(previousVersion)
          );
        }

        await this.dispatchEvents(project, tx);
      });
    } catch (error) {
      if (isWorkspaceCodeConflict(error))
        throw new DuplicateProjectCodeError(project.code);
      throw error;
    }
  }

  async findById(
    id: ProjectId,
    workspaceId: WorkspaceId
  ): Promise<Project | null> {
    const data = await this.prisma.project.findUnique({
      where: {
        id_workspaceId: {
          id: id.getValue(),
          workspaceId: workspaceId.getValue(),
        },
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
      version: data.version,
    });
  }

  async findByCode(
    code: string,
    workspaceId: WorkspaceId
  ): Promise<Project | null> {
    const data = await this.prisma.project.findFirst({
      where: {
        workspaceId: workspaceId.getValue(),
        code: { equals: code, mode: 'insensitive' },
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
      version: data.version,
    });
  }

  async findAll(
    workspaceId: WorkspaceId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Project>> {
    const where: Prisma.ProjectWhereInput = {
      workspaceId: workspaceId.getValue(),
    };

    return PrismaRepositoryHelper.paginate(
      (page) =>
        this.prisma.project.findMany({
          where,
          orderBy: managementOrderBy(options, 'project'),
          ...page,
        }),
      () => this.prisma.project.count({ where }),
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
          version: p.version,
        }),
      options
    );
  }
}
