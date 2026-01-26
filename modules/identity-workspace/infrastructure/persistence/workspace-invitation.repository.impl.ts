import { PrismaClient } from '@prisma/client'
import { IWorkspaceInvitationRepository } from '../../domain/repositories/workspace-invitation.repository'
import { WorkspaceInvitation, WorkspaceInvitationRow } from '../../domain/entities/workspace-invitation.entity'
import { InvitationId } from '../../domain/value-objects/invitation-id.vo'
import { WorkspaceId } from '../../domain/value-objects/workspace-id.vo'

export class WorkspaceInvitationRepositoryImpl implements IWorkspaceInvitationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Helper to convert Prisma result (camelCase) to WorkspaceInvitationRow (snake_case)
  private toDatabaseRow(prismaRow: any): WorkspaceInvitationRow {
    return {
      id: prismaRow.id,
      workspace_id: prismaRow.workspaceId,
      email: prismaRow.email,
      role: prismaRow.role,
      token: prismaRow.token,
      expires_at: prismaRow.expiresAt,
      accepted_at: prismaRow.acceptedAt,
      created_at: prismaRow.createdAt,
    }
  }

  async save(invitation: WorkspaceInvitation): Promise<void> {
    const data = invitation.toDatabaseRow()

    await this.prisma.workspaceInvitation.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        workspaceId: data.workspace_id,
        email: data.email,
        role: data.role,
        token: data.token,
        expiresAt: data.expires_at,
        acceptedAt: data.accepted_at,
        createdAt: data.created_at,
      },
      update: {
        acceptedAt: data.accepted_at,
      },
    })
  }

  async findById(id: InvitationId): Promise<WorkspaceInvitation | null> {
    const row = await this.prisma.workspaceInvitation.findUnique({
      where: { id: id.getValue() },
    })

    return row ? WorkspaceInvitation.fromDatabaseRow(this.toDatabaseRow(row)) : null
  }

  async findByToken(token: string): Promise<WorkspaceInvitation | null> {
    const row = await this.prisma.workspaceInvitation.findUnique({
      where: { token },
    })

    return row ? WorkspaceInvitation.fromDatabaseRow(this.toDatabaseRow(row)) : null
  }

  async findByWorkspaceId(workspaceId: WorkspaceId): Promise<WorkspaceInvitation[]> {
    const rows = await this.prisma.workspaceInvitation.findMany({
      where: { workspaceId: workspaceId.getValue() },
      orderBy: { createdAt: 'desc' },
    })

    return rows.map((row) => WorkspaceInvitation.fromDatabaseRow(this.toDatabaseRow(row)))
  }

  async findByEmail(email: string): Promise<WorkspaceInvitation[]> {
    const rows = await this.prisma.workspaceInvitation.findMany({
      where: { email: email.toLowerCase() },
      orderBy: { createdAt: 'desc' },
    })

    return rows.map((row) => WorkspaceInvitation.fromDatabaseRow(this.toDatabaseRow(row)))
  }

  async findPendingByWorkspaceAndEmail(
    workspaceId: WorkspaceId,
    email: string
  ): Promise<WorkspaceInvitation | null> {
    const row = await this.prisma.workspaceInvitation.findFirst({
      where: {
        workspaceId: workspaceId.getValue(),
        email: email.toLowerCase(),
        acceptedAt: null,
        expiresAt: {
          gt: new Date(), // Not expired
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return row ? WorkspaceInvitation.fromDatabaseRow(this.toDatabaseRow(row)) : null
  }

  async delete(id: InvitationId): Promise<void> {
    await this.prisma.workspaceInvitation.delete({
      where: { id: id.getValue() },
    })
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.workspaceInvitation.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        acceptedAt: null,
      },
    })

    return result.count
  }
}
