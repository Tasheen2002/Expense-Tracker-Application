import { PrismaClient, Prisma } from "@prisma/client";
import { Department } from "../../domain/entities/department.entity";
import { IDepartmentRepository } from "../../domain/repositories/department.repository";
import { DepartmentId } from "../../domain/value-objects/department-id";
import {  WorkspaceId  } from '@core/domain/value-objects';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '@core/domain/events/domain-event';
import { managementOrderBy } from './management-order';
import { isWorkspaceCodeConflict } from './management-constraint';
import { DuplicateDepartmentCodeError, ManagementConcurrencyConflictError } from '../../domain/errors/cost-allocation.errors';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';

export class DepartmentRepositoryImpl
  extends PrismaRepository<Department>
  implements IDepartmentRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(department: Department): Promise<void> {
    try {
      await this.runInTransaction(async (tx) => {
        const id = department.id.getValue();
        const workspaceId = department.workspaceId.getValue();
        const existing = await tx.department.findUnique({ where: { id }, select: { id: true } });
        if (!existing) {
          await tx.department.create({
            data: {
              id,
              workspaceId,
              name: department.name,
              code: department.code,
              description: department.description,
              managerId: department.managerId?.getValue() || null,
              parentDepartmentId: department.parentDepartmentId?.getValue() || null,
              isActive: department.isActive,
              createdAt: department.createdAt,
              updatedAt: department.updatedAt,
              version: department.version,
            },
          });
        } else {
          const updated = await tx.department.updateMany({
            where: { id, workspaceId, version: department.version },
            data: {
              name: department.name,
              code: department.code,
              description: department.description,
              managerId: department.managerId?.getValue() || null,
              parentDepartmentId: department.parentDepartmentId?.getValue() || null,
              isActive: department.isActive,
              updatedAt: department.updatedAt,
              version: { increment: 1 },
            },
          });
          if (updated.count !== 1) {
            throw new ManagementConcurrencyConflictError('Department', id);
          }
          const previousVersion = department.version;
          department.synchronizeVersion(previousVersion + 1);
          PrismaUnitOfWork.addRollbackHook(() => department.synchronizeVersion(previousVersion));
        }

        await this.dispatchEvents(department, tx);
      });
    } catch (error) {
      if (isWorkspaceCodeConflict(error)) throw new DuplicateDepartmentCodeError(department.code);
      throw error;
    }
  }

  async findById(id: DepartmentId, workspaceId: WorkspaceId): Promise<Department | null> {
    const data = await this.prisma.department.findUnique({
      where: { id_workspaceId: { id: id.getValue(), workspaceId: workspaceId.getValue() } },
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
      version: data.version,
    });
  }

  async findByCode(
    code: string,
    workspaceId: WorkspaceId,
  ): Promise<Department | null> {
    const data = await this.prisma.department.findFirst({
      where: {
        workspaceId: workspaceId.getValue(),
        code: { equals: code, mode: 'insensitive' },
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
      version: data.version,
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
      { where, orderBy: managementOrderBy(options, 'department') },
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
          version: d.version,
        }),
      options,
    );
  }

}
