import { PrismaClient, Prisma } from "@prisma/client";
import { IWorkspaceMembershipRepository } from "../../domain/repositories/workspace-membership.repository";
import {
  WorkspaceMembership,
  WorkspaceRole,
} from "../../domain/entities/workspace-membership.entity";
import { MembershipId } from "../../domain/value-objects/membership-id.vo";
import { UserId } from "../../domain/value-objects/user-id.vo";
import { WorkspaceId } from "../../domain/value-objects/workspace-id.vo";
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '../../../../packages/core/src/domain/events/domain-event';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';

export class WorkspaceMembershipRepositoryImpl
  extends PrismaRepository<WorkspaceMembership>
  implements IWorkspaceMembershipRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  private toDomain(row: Prisma.WorkspaceMembershipGetPayload<{}>): WorkspaceMembership {
    return WorkspaceMembership.fromPersistence({
      id: row.id,
      userId: row.userId,
      workspaceId: row.workspaceId,
      role: row.role as WorkspaceRole,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async save(membership: WorkspaceMembership): Promise<void> {
    await this.prisma.workspaceMembership.upsert({
      where: { id: membership.id.getValue() },
      create: {
        id: membership.id.getValue(),
        userId: membership.userId.getValue(),
        workspaceId: membership.workspaceId.getValue(),
        role: membership.role,
        createdAt: membership.createdAt,
        updatedAt: membership.updatedAt,
      },
      update: {
        role: membership.role,
        updatedAt: membership.updatedAt,
      },
    });
    await this.dispatchEvents(membership);
  }

  async update(membership: WorkspaceMembership): Promise<void> {
    await this.prisma.workspaceMembership.update({
      where: { id: membership.id.getValue() },
      data: {
        role: membership.role,
        updatedAt: membership.updatedAt,
      },
    });
    await this.dispatchEvents(membership);
  }

  async findById(id: MembershipId): Promise<WorkspaceMembership | null> {
    const row = await this.prisma.workspaceMembership.findUnique({
      where: { id: id.getValue() },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByUserAndWorkspace(
    userId: UserId,
    workspaceId: WorkspaceId,
  ): Promise<WorkspaceMembership | null> {
    const row = await this.prisma.workspaceMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId: userId.getValue(),
          workspaceId: workspaceId.getValue(),
        },
      },
    });

    return row
      ? this.toDomain(row)
      : null;
  }

  async findByUserId(
    userId: UserId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<WorkspaceMembership>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.workspaceMembership,
      {
        where: { userId: userId.getValue() },
        orderBy: { createdAt: "desc" },
      },
      (row) => this.toDomain(row),
      options,
    );
  }

  async findByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<WorkspaceMembership>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.workspaceMembership,
      {
        where: { workspaceId: workspaceId.getValue() },
        orderBy: { createdAt: "asc" },
      },
      (row) => this.toDomain(row),
      options,
    );
  }

  async delete(id: MembershipId): Promise<void> {
    await this.prisma.workspaceMembership.delete({
      where: { id: id.getValue() },
    });
  }

  async exists(userId: UserId, workspaceId: WorkspaceId): Promise<boolean> {
    const count = await this.prisma.workspaceMembership.count({
      where: {
        userId: userId.getValue(),
        workspaceId: workspaceId.getValue(),
      },
    });

    return count > 0;
  }

  async countByWorkspaceId(workspaceId: WorkspaceId): Promise<number> {
    return await this.prisma.workspaceMembership.count({
      where: { workspaceId: workspaceId.getValue() },
    });
  }
}
