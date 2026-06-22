import { PrismaClient, Prisma } from "@prisma/client";
import { IWorkspaceInvitationRepository } from "../../domain/repositories/workspace-invitation.repository";
import { WorkspaceInvitation } from "../../domain/entities/workspace-invitation.entity";
import { WorkspaceMembership } from "../../domain/entities/workspace-membership.entity";
import { InvitationId } from "../../domain/value-objects/invitation-id.vo";
import { WorkspaceId } from "../../domain/value-objects/workspace-id.vo";
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '@core/domain/events/domain-event';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';

export class WorkspaceInvitationRepositoryImpl
  extends PrismaRepository<WorkspaceInvitation>
  implements IWorkspaceInvitationRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  private toDomain(row: Prisma.WorkspaceInvitationGetPayload<{}>): WorkspaceInvitation {
    return WorkspaceInvitation.fromPersistence({
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
      where: { id: invitation.id.getValue() },
      create: {
        id: invitation.id.getValue(),
        workspaceId: invitation.workspaceId.getValue(),
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
        acceptedAt: invitation.acceptedAt,
        createdAt: invitation.createdAt,
      },
      update: {
        acceptedAt: invitation.acceptedAt,
      },
    });
    await this.dispatchEvents(invitation);
  }

  async findById(id: InvitationId): Promise<WorkspaceInvitation | null> {
    const row = await this.prisma.workspaceInvitation.findUnique({
      where: { id: id.getValue() },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByToken(token: string): Promise<WorkspaceInvitation | null> {
    const row = await this.prisma.workspaceInvitation.findUnique({
      where: { token },
    });

    return row ? this.toDomain(row) : null;
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
      (row) => this.toDomain(row),
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
      (row) => this.toDomain(row),
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
      (row) => this.toDomain(row),
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

    return row ? this.toDomain(row) : null;
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
        where: { id: invitation.id.getValue() },
        data: {
          acceptedAt: invitation.acceptedAt,
        },
      }),
      this.prisma.workspaceMembership.create({
        data: {
          id: membership.id.getValue(),
          userId: membership.userId.getValue(),
          workspaceId: membership.workspaceId.getValue(),
          role: membership.role,
          createdAt: membership.createdAt,
          updatedAt: membership.updatedAt,
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
