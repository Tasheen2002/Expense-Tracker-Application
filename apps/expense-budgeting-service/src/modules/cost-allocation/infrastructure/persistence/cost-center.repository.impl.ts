import { PrismaClient, Prisma } from "@prisma/client";
import { CostCenter } from "../../domain/entities/cost-center.entity";
import { ICostCenterRepository } from "../../domain/repositories/cost-center.repository";
import { CostCenterId } from "../../domain/value-objects/cost-center-id";
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
import { DuplicateCostCenterCodeError, ManagementConcurrencyConflictError } from '../../domain/errors/cost-allocation.errors';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';

export class CostCenterRepositoryImpl
  extends PrismaRepository<CostCenter>
  implements ICostCenterRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(costCenter: CostCenter): Promise<void> {
    try {
      await this.runInTransaction(async (tx) => {
        const id = costCenter.id.getValue();
        const workspaceId = costCenter.workspaceId.getValue();
        const existing = await tx.costCenter.findUnique({ where: { id }, select: { id: true } });
        if (!existing) {
          await tx.costCenter.create({
            data: {
              id,
              workspaceId,
              name: costCenter.name,
              code: costCenter.code,
              description: costCenter.description,
              isActive: costCenter.isActive,
              createdAt: costCenter.createdAt,
              updatedAt: costCenter.updatedAt,
              version: costCenter.version,
            },
          });
        } else {
          const updated = await tx.costCenter.updateMany({
            where: { id, workspaceId, version: costCenter.version },
            data: {
              name: costCenter.name,
              code: costCenter.code,
              description: costCenter.description,
              isActive: costCenter.isActive,
              updatedAt: costCenter.updatedAt,
              version: { increment: 1 },
            },
          });
          if (updated.count !== 1) {
            throw new ManagementConcurrencyConflictError('Cost center', id);
          }
          const previousVersion = costCenter.version;
          costCenter.synchronizeVersion(previousVersion + 1);
          PrismaUnitOfWork.addRollbackHook(() => costCenter.synchronizeVersion(previousVersion));
        }

        await this.dispatchEvents(costCenter, tx);
      });
    } catch (error) {
      if (isWorkspaceCodeConflict(error)) throw new DuplicateCostCenterCodeError(costCenter.code);
      throw error;
    }
  }

  async findById(id: CostCenterId, workspaceId: WorkspaceId): Promise<CostCenter | null> {
    const data = await this.prisma.costCenter.findUnique({
      where: { id_workspaceId: { id: id.getValue(), workspaceId: workspaceId.getValue() } },
    });

    if (!data) return null;

    return CostCenter.fromPersistence({
      id: data.id,
      workspaceId: data.workspaceId,
      name: data.name,
      code: data.code,
      description: data.description,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      version: data.version,
    });
  }

  async findByCode(
    code: string,
    workspaceId: WorkspaceId,
  ): Promise<CostCenter | null> {
    const data = await this.prisma.costCenter.findFirst({
      where: {
        workspaceId: workspaceId.getValue(),
        code: { equals: code, mode: 'insensitive' },
      },
    });

    if (!data) return null;

    return CostCenter.fromPersistence({
      id: data.id,
      workspaceId: data.workspaceId,
      name: data.name,
      code: data.code,
      description: data.description,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      version: data.version,
    });
  }

  async findAll(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<CostCenter>> {
    const where: Prisma.CostCenterWhereInput = {
      workspaceId: workspaceId.getValue(),
    };

    return PrismaRepositoryHelper.paginate(
      this.prisma.costCenter,
      { where, orderBy: managementOrderBy(options, 'costCenter') },
      (c) =>
        CostCenter.fromPersistence({
          id: c.id,
          workspaceId: c.workspaceId,
          name: c.name,
          code: c.code,
          description: c.description,
          isActive: c.isActive,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          version: c.version,
        }),
      options,
    );
  }

}
