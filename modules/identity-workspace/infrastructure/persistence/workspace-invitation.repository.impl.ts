import { PrismaClient, Prisma } from "@prisma/client";
import { IWorkspaceInvitationRepository } from "../../domain/repositories/workspace-invitation.repository";
import {
  WorkspaceInvitation,
  WorkspaceInvitationRow,
} from "../../domain/entities/workspace-invitation.entity";
import { WorkspaceMembership } from "../../domain/entities/workspace-membership.entity";
import { InvitationId } from "../../domain/value-objects/invitation-id.vo";
import { WorkspaceId } from "../../domain/value-objects/workspace-id.vo";
import { PrismaRepository } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.base";
import { IEventBus } from "../../../../apps/api/src/shared/domain/events/domain-event";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PrismaRepositoryHelper } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper";

export class WorkspaceInvitationRepositoryImpl
  extends PrismaRepository<WorkspaceInvitation>
  implements IWorkspaceInvitationRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  // Helper to convert Prisma result (camelCase) to WorkspaceInvitationRow (snake_case)
  private toDatabaseRow(
    prismaRow: Prisma.WorkspaceInvitationGetPayload<{}>,
  ): WorkspaceInvitationRow {
    return {
      id: prismaRow.id,
      workspace_id: prismaRow.workspaceId,
      email: prismaRow.email,
      role: prismaRow.role,
      token: prismaRow.token,
      expires_at: prismaRow.expiresAt,
      accepted_at: prismaRow.acceptedAt,
      created_at: prismaRow.createdAt,
    };
  }

  async save(invitation: WorkspaceInvitation): Promise<void> {
    const data = invitation.toDatabaseRow();

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
    });
    await this.dispatchEvents(invitation);
  }

  async findById(id: InvitationId): Promise<WorkspaceInvitation | null> {
    const row = await this.prisma.workspaceInvitation.findUnique({
      where: { id: id.getValue() },
    });

    return row
      ? WorkspaceInvitation.fromDatabaseRow(this.toDatabaseRow(row))
      : null;
  }

  async findByToken(token: string): Promise<WorkspaceInvitation | null> {
    const row = await this.prisma.workspaceInvitation.findUnique({
      where: { token },
    });

    return row
      ? WorkspaceInvitation.fromDatabaseRow(this.toDatabaseRow(row))
      : null;
  }

  async findByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<WorkspaceInvitation>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.workspaceInvitation,
      {
        where: { workspaceId: workspaceId.getValue() },
        orderBy: { createdAt: "desc" },
      },
      (row) => WorkspaceInvitation.fromDatabaseRow(this.toDatabaseRow(row)),
      options,
    );
  }

  async findByEmail(
    email: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<WorkspaceInvitation>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.workspaceInvitation,
      {
        where: { email: email.toLowerCase() },
        orderBy: { createdAt: "desc" },
      },
      (row) => WorkspaceInvitation.fromDatabaseRow(this.toDatabaseRow(row)),
      options,
    );
  }

  async findPendingByWorkspaceAndEmail(
    workspaceId: WorkspaceId,
    email: string,
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
      orderBy: { createdAt: "desc" },
    });

    return row
      ? WorkspaceInvitation.fromDatabaseRow(this.toDatabaseRow(row))
      : null;
  }

  async delete(id: InvitationId): Promise<void> {
    await this.prisma.workspaceInvitation.delete({
      where: { id: id.getValue() },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.workspaceInvitation.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        acceptedAt: null,
      },
    });

    return result.count;
  }

  async acceptInvitationTransaction(
    invitation: WorkspaceInvitation,
    membership: WorkspaceMembership,
  ): Promise<void> {
    const invData = invitation.toDatabaseRow();
    const memData = membership.toDatabaseRow();

    await this.prisma.$transaction([
      // Update invitation
      this.prisma.workspaceInvitation.update({
        where: { id: invData.id },
        data: {
          acceptedAt: invData.accepted_at,
          // We only need to update acceptedAt, likely
        },
      }),
      // Create membership
      this.prisma.workspaceMembership.create({
        data: {
          id: memData.id,
          userId: memData.user_id,
          workspaceId: memData.workspace_id,
          role: memData.role,
          createdAt: memData.created_at,
          updatedAt: memData.updated_at,
        },
      }),
    ]);
  }
}
