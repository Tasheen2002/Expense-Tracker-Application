import { PrismaClient, Prisma } from "@prisma/client";
import { IWorkspaceMembershipRepository } from "../../domain/repositories/workspace-membership.repository";
import {
  WorkspaceMembership,
  WorkspaceMembershipRow,
} from "../../domain/entities/workspace-membership.entity";
import { MembershipId } from "../../domain/value-objects/membership-id.vo";
import { UserId } from "../../domain/value-objects/user-id.vo";
import { WorkspaceId } from "../../domain/value-objects/workspace-id.vo";
import { PrismaRepository } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.base";
import { IEventBus } from "../../../../apps/api/src/shared/domain/events/domain-event";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PrismaRepositoryHelper } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper";

export class WorkspaceMembershipRepositoryImpl
  extends PrismaRepository<WorkspaceMembership>
  implements IWorkspaceMembershipRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  // Helper to convert Prisma result (camelCase) to WorkspaceMembershipRow (snake_case)
  private toDatabaseRow(
    prismaRow: Prisma.WorkspaceMembershipGetPayload<{}>,
  ): WorkspaceMembershipRow {
    return {
      id: prismaRow.id,
      user_id: prismaRow.userId,
      workspace_id: prismaRow.workspaceId,
      role: prismaRow.role,
      created_at: prismaRow.createdAt,
      updated_at: prismaRow.updatedAt,
    };
  }

  async save(membership: WorkspaceMembership): Promise<void> {
    const data = membership.toDatabaseRow();

    await this.prisma.workspaceMembership.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        userId: data.user_id,
        workspaceId: data.workspace_id,
        role: data.role,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
      update: {
        role: data.role,
        updatedAt: data.updated_at,
      },
    });
    await this.dispatchEvents(membership);
  }

  async findById(id: MembershipId): Promise<WorkspaceMembership | null> {
    const row = await this.prisma.workspaceMembership.findUnique({
      where: { id: id.getValue() },
    });

    return row
      ? WorkspaceMembership.fromDatabaseRow(this.toDatabaseRow(row))
      : null;
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
      ? WorkspaceMembership.fromDatabaseRow(this.toDatabaseRow(row))
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
      (row) => WorkspaceMembership.fromDatabaseRow(this.toDatabaseRow(row)),
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
      (row) => WorkspaceMembership.fromDatabaseRow(this.toDatabaseRow(row)),
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
