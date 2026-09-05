import { PrismaClient, Prisma } from '@prisma/client';
import { Supplier } from '../../domain/entities/supplier.entity';
import { SupplierId } from '../../domain/value-objects/supplier-id.vo';
import { ISupplierRepository } from '../../domain/repositories/supplier.repository';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '@core/domain/events/domain-event';

export class SupplierRepositoryImpl
  extends PrismaRepository<Supplier>
  implements ISupplierRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(supplier: Supplier): Promise<void> {
    await this.prisma.supplier.upsert({
      where: { id: supplier.id.getValue() },
      create: {
        id: supplier.id.getValue(),
        workspaceId: supplier.workspaceId,
        name: supplier.name,
        contactEmail: supplier.contactEmail,
        contactPhone: supplier.contactPhone,
        address: supplier.address,
        isActive: supplier.isActive,
        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt,
      },
      update: {
        name: supplier.name,
        contactEmail: supplier.contactEmail,
        contactPhone: supplier.contactPhone,
        address: supplier.address,
        isActive: supplier.isActive,
        updatedAt: supplier.updatedAt,
      },
    });

    await this.dispatchEvents(supplier);
  }

  async findById(id: SupplierId, workspaceId: string): Promise<Supplier | null> {
    const row = await this.prisma.supplier.findFirst({
      where: { id: id.getValue(), workspaceId },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Supplier>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.supplier,
      { where: { workspaceId }, orderBy: { createdAt: 'desc' } },
      (record) => this.toDomain(record),
      options
    );
  }

  async delete(id: SupplierId, workspaceId: string): Promise<void> {
    await this.prisma.supplier.delete({
      where: { id: id.getValue(), workspaceId },
    });
  }

  async exists(id: SupplierId, workspaceId: string): Promise<boolean> {
    const count = await this.prisma.supplier.count({
      where: { id: id.getValue(), workspaceId },
    });
    return count > 0;
  }

  async existsByName(name: string, workspaceId: string): Promise<boolean> {
    const count = await this.prisma.supplier.count({
      where: { name, workspaceId },
    });
    return count > 0;
  }

  private toDomain(row: Prisma.SupplierGetPayload<object>): Supplier {
    return Supplier.fromPersistence({
      id: SupplierId.fromString(row.id),
      workspaceId: row.workspaceId,
      name: row.name,
      contactEmail: row.contactEmail,
      contactPhone: row.contactPhone,
      address: row.address,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
