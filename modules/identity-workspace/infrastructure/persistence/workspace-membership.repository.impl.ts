import { PrismaClient } from '@prisma/client'
import { IWorkspaceMembershipRepository } from '../../domain/repositories/workspace-membership.repository'
import { WorkspaceMembership, WorkspaceMembershipRow } from '../../domain/entities/workspace-membership.entity'
import { MembershipId } from '../../domain/value-objects/membership-id.vo'
import { UserId } from '../../domain/value-objects/user-id.vo'
import { WorkspaceId } from '../../domain/value-objects/workspace-id.vo'

export class WorkspaceMembershipRepositoryImpl implements IWorkspaceMembershipRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Helper to convert Prisma result (camelCase) to WorkspaceMembershipRow (snake_case)
  private toDatabaseRow(prismaRow: any): WorkspaceMembershipRow {
    return {
      id: prismaRow.id,
      user_id: prismaRow.userId,
      workspace_id: prismaRow.workspaceId,
      role: prismaRow.role,
      created_at: prismaRow.createdAt,
      updated_at: prismaRow.updatedAt,
    }
  }

  async save(membership: WorkspaceMembership): Promise<void> {
    const data = membership.toDatabaseRow()

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
    })
  }

  async findById(id: MembershipId): Promise<WorkspaceMembership | null> {
    const row = await this.prisma.workspaceMembership.findUnique({
      where: { id: id.getValue() },
    })

    return row ? WorkspaceMembership.fromDatabaseRow(this.toDatabaseRow(row)) : null
  }

  async findByUserAndWorkspace(
    userId: UserId,
    workspaceId: WorkspaceId
  ): Promise<WorkspaceMembership | null> {
    const row = await this.prisma.workspaceMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId: userId.getValue(),
          workspaceId: workspaceId.getValue(),
        },
      },
    })

    return row ? WorkspaceMembership.fromDatabaseRow(this.toDatabaseRow(row)) : null
  }

  async findByUserId(userId: UserId): Promise<WorkspaceMembership[]> {
    const rows = await this.prisma.workspaceMembership.findMany({
      where: { userId: userId.getValue() },
      orderBy: { createdAt: 'desc' },
    })

    return rows.map((row) => WorkspaceMembership.fromDatabaseRow(this.toDatabaseRow(row)))
  }

  async findByWorkspaceId(workspaceId: WorkspaceId): Promise<WorkspaceMembership[]> {
    const rows = await this.prisma.workspaceMembership.findMany({
      where: { workspaceId: workspaceId.getValue() },
      orderBy: { createdAt: 'asc' },
    })

    return rows.map((row) => WorkspaceMembership.fromDatabaseRow(this.toDatabaseRow(row)))
  }

  async delete(id: MembershipId): Promise<void> {
    await this.prisma.workspaceMembership.delete({
      where: { id: id.getValue() },
    })
  }

  async exists(userId: UserId, workspaceId: WorkspaceId): Promise<boolean> {
    const count = await this.prisma.workspaceMembership.count({
      where: {
        userId: userId.getValue(),
        workspaceId: workspaceId.getValue(),
      },
    })

    return count > 0
  }

  async countByWorkspaceId(workspaceId: WorkspaceId): Promise<number> {
    return await this.prisma.workspaceMembership.count({
      where: { workspaceId: workspaceId.getValue() },
    })
  }
}
