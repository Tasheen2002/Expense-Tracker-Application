import { PrismaClient } from "@prisma/client";
import { CostCenter } from "../../domain/entities/cost-center.entity";
import { CostCenterRepository } from "../../domain/repositories/cost-center.repository";
import { CostCenterId } from "../../domain/value-objects/cost-center-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export class CostCenterRepositoryImpl implements CostCenterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(costCenter: CostCenter): Promise<void> {
    await this.prisma.costCenter.upsert({
      where: {
        id: costCenter.getId().getValue(),
      },
      create: {
        id: costCenter.getId().getValue(),
        workspaceId: costCenter.getWorkspaceId().getValue(),
        name: costCenter.getName(),
        code: costCenter.getCode(),
        description: costCenter.getDescription(),
        isActive: costCenter.getIsActive(),
        createdAt: costCenter.getCreatedAt(),
        updatedAt: costCenter.getUpdatedAt(),
      },
      update: {
        name: costCenter.getName(),
        code: costCenter.getCode(),
        description: costCenter.getDescription(),
        isActive: costCenter.getIsActive(),
        updatedAt: costCenter.getUpdatedAt(),
      },
    });
  }

  async findById(id: CostCenterId): Promise<CostCenter | null> {
    const data = await this.prisma.costCenter.findUnique({
      where: { id: id.getValue() },
    });

    if (!data) return null;

    return CostCenter.reconstitute({
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

    return CostCenter.reconstitute({
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
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const where = { workspaceId: workspaceId.getValue() };

    const [data, total] = await Promise.all([
      this.prisma.costCenter.findMany({
        where,
        take: limit,
        skip: offset,
      }),
      this.prisma.costCenter.count({ where }),
    ]);

    const items = data.map((c) =>
      CostCenter.reconstitute({
        id: c.id,
        workspaceId: c.workspaceId,
        name: c.name,
        code: c.code,
        description: c.description,
        isActive: c.isActive,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
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

  async delete(id: CostCenterId, workspaceId: WorkspaceId): Promise<void> {
    await this.prisma.costCenter.delete({
      where: {
        id: id.getValue(),
        workspaceId: workspaceId.getValue(),
      },
    });
  }
}
