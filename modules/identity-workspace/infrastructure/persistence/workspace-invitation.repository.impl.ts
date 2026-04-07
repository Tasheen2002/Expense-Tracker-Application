import { PrismaClient, Prisma } from "@prisma/client";
import { IWorkspaceInvitationRepository } from "../../domain/repositories/workspace-invitation.repository";
import { WorkspaceInvitation } from "../../domain/entities/workspace-invitation.entity";
import { WorkspaceMembership } from "../../domain/entities/workspace-membership.entity";
import { InvitationId } from "../../domain/value-objects/invitation-id.vo";
import { WorkspaceId } from "../../domain/value-objects/workspace-id.vo";
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '../../../../packages/core/src/domain/events/domain-event';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';

export class WorkspaceInvitationRepositoryImpl
  extends PrismaRepository<WorkspaceInvitation>
  implements IWorkspaceInvitationRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  private reconstitute(row: Prisma.WorkspaceInvitationGetPayload<{}>): WorkspaceInvitation {
    return WorkspaceInvitation.reconstitute({
      id: row.id,
      workspaceId: row.workspaceId,
      email: row.email,
      role: row.role as any,
      token: row.token,
      expiresAt: row.expiresAt,
      acceptedAt: row.acceptedAt,
      createdAt: row.createdAt,
    });
  }

  async save(invitation: WorkspaceInvitation): Promise<void> {
    await this.prisma.workspaceInvitation.upsert({
      where: { id: invitation.getId().getValue() },
      create: {
        id: invitation.getId().getValue(),
        workspaceId: invitation.getWorkspaceId().getValue(),
        email: invitation.getEmail(),
        role: invitation.getRole(),
        token: invitation.getToken(),
        expiresAt: invitation.getExpiresAt(),
        acceptedAt: invitation.getAcceptedAt(),
        createdAt: invitation.getCreatedAt(),
      },
      update: {
        acceptedAt: invitation.getAcceptedAt(),
      },
    });
    await this.dispatchEvents(invitation);
  }

  async findById(id: InvitationId): Promise<WorkspaceInvitation | null> {
    const row = await this.prisma.workspaceInvitation.findUnique({
      where: { id: id.getValue() },
    });

    return row ? this.reconstitute(row) : null;
  }

  async findByToken(token: string): Promise<WorkspaceInvitation | null> {
    const row = await this.prisma.workspaceInvitation.findUnique({
      where: { token },
    });

    return row ? this.reconstitute(row) : null;
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
      (row) => this.reconstitute(row),
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
      (row) => this.reconstitute(row),
      options,
    );
  }

  async findPendingByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<WorkspaceInvitation>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.workspaceInvitation,
      {
        where: {
          workspaceId: workspaceId.getValue(),
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      },
      (row) => this.reconstitute(row),
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
          gt: new Date(),
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return row ? this.reconstitute(row) : null;
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
    await this.prisma.$transaction([
      this.prisma.workspaceInvitation.update({
        where: { id: invitation.getId().getValue() },
        data: {
          acceptedAt: invitation.getAcceptedAt(),
        },
      }),
      this.prisma.workspaceMembership.create({
        data: {
          id: membership.getId().getValue(),
          userId: membership.getUserId().getValue(),
          workspaceId: membership.getWorkspaceId().getValue(),
          role: membership.getRole(),
          createdAt: membership.getCreatedAt(),
          updatedAt: membership.getUpdatedAt(),
        },
      }),
    ]);

    await this.dispatchEvents(invitation);

    const membershipEvents = membership.domainEvents;
    if (membershipEvents.length > 0) {
      await this.eventBus.publishAll(membershipEvents);
      membership.clearDomainEvents();
    }
  }
}
