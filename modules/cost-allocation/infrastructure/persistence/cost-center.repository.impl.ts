import { PrismaClient, Prisma } from "@prisma/client";
import { CostCenter } from "../../domain/entities/cost-center.entity";
import { ICostCenterRepository } from "../../domain/repositories/cost-center.repository";
import { CostCenterId } from "../../domain/value-objects/cost-center-id";
import { WorkspaceId } from "../../../identity-workspace";
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '../../../../packages/core/src/domain/events/domain-event';

export class CostCenterRepositoryImpl
  extends PrismaRepository<CostCenter>
  implements ICostCenterRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(costCenter: CostCenter): Promise<void> {
    await this.prisma.costCenter.upsert({
      where: {
        id: costCenter.id.getValue(),
      },
      create: {
        id: costCenter.id.getValue(),
        workspaceId: costCenter.workspaceId.getValue(),
        name: costCenter.name,
        code: costCenter.code,
        description: costCenter.description,
        isActive: costCenter.isActive,
        createdAt: costCenter.createdAt,
        updatedAt: costCenter.updatedAt,
      },
      update: {
        name: costCenter.name,
        code: costCenter.code,
        description: costCenter.description,
        isActive: costCenter.isActive,
        updatedAt: costCenter.updatedAt,
      },
    });

    await this.dispatchEvents(costCenter);
  }

  async findById(id: CostCenterId): Promise<CostCenter | null> {
    const data = await this.prisma.costCenter.findUnique({
      where: { id: id.getValue() },
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
    });
  }

  async findByCode(
    code: string,
    workspaceId: WorkspaceId,
  ): Promise<CostCenter | null> {
    const data = await this.prisma.costCenter.findFirst({
      where: {
        workspaceId: workspaceId.getValue(),
        code: code,
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
      { where },
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
        }),
      options,
    );
  }

  async delete(id: CostCenterId, workspaceId: WorkspaceId): Promise<void> {
    await this.prisma.costCenter.delete({
      where: {
        id: id.getValue(),
        workspaceId: workspaceId.getValue(),
      },
    });
  }
}
