import { Prisma } from '@prisma/client';
import { InvitationAlreadyAcceptedError } from '../../domain/errors/identity.errors';
import { IWorkspaceInvitationRepository } from '../../domain/repositories/workspace-invitation.repository';
import { WorkspaceInvitation } from '../../domain/entities/workspace-invitation.entity';
import {
  WorkspaceMembership,
  WorkspaceRole,
} from '../../domain/entities/workspace-membership.entity';
import { InvitationId } from '../../domain/value-objects/invitation-id.vo';
import { WorkspaceId } from '../../domain/value-objects/workspace-id.vo';
import { Email } from '../../domain/value-objects/email.vo';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';

export class WorkspaceInvitationRepositoryImpl
  extends PrismaRepository<WorkspaceInvitation>
  implements IWorkspaceInvitationRepository
{
  private toDomain(row: Prisma.WorkspaceInvitationGetPayload<object>): WorkspaceInvitation {
    return WorkspaceInvitation.fromPersistence({
      id: row.id,
      workspaceId: row.workspaceId,
      email: row.email,
      role: row.role as WorkspaceRole,
      token: row.token,
      expiresAt: row.expiresAt,
      acceptedAt: row.acceptedAt,
      cancelledAt: row.cancelledAt,
      createdAt: row.createdAt,
    });
  }

  async save(invitation: WorkspaceInvitation): Promise<void> {
    await this.context.execute(async () => {
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
          cancelledAt: invitation.cancelledAt,
          createdAt: invitation.createdAt,
        },
        update: {
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          acceptedAt: invitation.acceptedAt,
          cancelledAt: invitation.cancelledAt,
        },
      });

      await this.persistEvents(invitation);
    });
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
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      },
      (row) => this.toDomain(row),
      options,
    );
  }

  async findByEmail(
    email: string | Email,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<WorkspaceInvitation>> {
    const emailStr = typeof email === 'string' ? email.toLowerCase() : email.getValue();
    return PrismaRepositoryHelper.paginate(
      this.prisma.workspaceInvitation,
      {
        where: { email: emailStr },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
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
          cancelledAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      },
      (row) => this.toDomain(row),
      options,
    );
  }

  async findPendingByWorkspaceAndEmail(
    workspaceId: WorkspaceId,
    email: string | Email,
  ): Promise<WorkspaceInvitation | null> {
    const emailStr = typeof email === 'string' ? email.toLowerCase() : email.getValue();
    const row = await this.prisma.workspaceInvitation.findFirst({
      where: {
        workspaceId: workspaceId.getValue(),
        email: emailStr,
        acceptedAt: null,
        cancelledAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: 'desc' },
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
        cancelledAt: null,
      },
    });

    return result.count;
  }

  async acceptInvitationTransaction(
    invitation: WorkspaceInvitation,
    membership: WorkspaceMembership,
  ): Promise<void> {
    await this.context.execute(async () => {
      const updated = await this.prisma.workspaceInvitation.updateMany({
        where: {
          id: invitation.id.getValue(),
          acceptedAt: null,
          cancelledAt: null,
          expiresAt: { gt: new Date() },
        },
        data: {
          acceptedAt: invitation.acceptedAt,
        },
      });

      if (updated.count !== 1) {
        throw new InvitationAlreadyAcceptedError();
      }

      await this.prisma.workspaceMembership.create({
        data: {
          id: membership.id.getValue(),
          userId: membership.userId.getValue(),
          workspaceId: membership.workspaceId.getValue(),
          role: membership.role,
          createdAt: membership.createdAt,
          updatedAt: membership.updatedAt,
        },
      });

      await this.persistEvents(invitation);
      await this.context.recordEvents(membership);
    });
  }
}
