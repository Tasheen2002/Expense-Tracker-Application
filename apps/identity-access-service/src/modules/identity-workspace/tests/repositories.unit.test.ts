import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import { UserRepositoryImpl } from '../infrastructure/persistence/user.repository.impl';
import { WorkspaceRepositoryImpl } from '../infrastructure/persistence/workspace.repository.impl';
import { WorkspaceMembershipRepositoryImpl } from '../infrastructure/persistence/workspace-membership.repository.impl';
import { WorkspaceInvitationRepositoryImpl } from '../infrastructure/persistence/workspace-invitation.repository.impl';
import { User } from '../domain/entities/user.entity';
import { Workspace } from '../domain/entities/workspace.entity';
import { WorkspaceMembership, WorkspaceRole } from '../domain/entities/workspace-membership.entity';
import { WorkspaceInvitation } from '../domain/entities/workspace-invitation.entity';
import { UserId } from '../domain/value-objects/user-id.vo';
import { WorkspaceId } from '../domain/value-objects/workspace-id.vo';
import { Email } from '../domain/value-objects/email.vo';
import { MembershipId } from '../domain/value-objects/membership-id.vo';
import { InvitationId } from '../domain/value-objects/invitation-id.vo';
import { InvitationAlreadyAcceptedError } from '../domain/errors/identity.errors';
import { IdentityPersistenceContext } from '@shared/infrastructure/persistence/identity-persistence.context';

describe('Repository Implementations Unit Tests', () => {
  let mockPrisma: any;
  let mockContext: IdentityPersistenceContext;

  beforeEach(() => {
    mockPrisma = {
      userAccount: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        delete: vi.fn(),
      },
      workspace: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        delete: vi.fn(),
      },
      workspaceMembership: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        upsert: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        delete: vi.fn(),
      },
      workspaceInvitation: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        upsert: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        updateMany: vi.fn(),
      },
      outboxEvent: {
        create: vi.fn(),
      },
    };

    mockContext = {
      client: mockPrisma,
      execute: vi.fn(async (work: () => Promise<any>) => work()),
      recordEvents: vi.fn(async () => {}),
    } as unknown as IdentityPersistenceContext;
  });

  describe('UserRepositoryImpl', () => {
    let repo: UserRepositoryImpl;

    beforeEach(() => {
      repo = new UserRepositoryImpl(mockContext);
    });

    it('should save a user and persist outbox events', async () => {
      const user = User.create({
        email: 'test@example.com',
        passwordHash: 'hashed_password_123',
        fullName: 'Test User',
      });

      await repo.save(user);

      expect(mockContext.execute).toHaveBeenCalledTimes(1);
      expect(mockPrisma.userAccount.upsert).toHaveBeenCalledWith({
        where: { id: user.id.getValue() },
        create: expect.objectContaining({
          id: user.id.getValue(),
          email: 'test@example.com',
          fullName: 'Test User',
        }),
        update: expect.objectContaining({
          email: 'test@example.com',
          fullName: 'Test User',
        }),
      });
      expect(mockContext.recordEvents).toHaveBeenCalledWith(user);
    });

    it('should findById and map to domain entity', async () => {
      const id = UserId.create();
      mockPrisma.userAccount.findUnique.mockResolvedValueOnce({
        id: id.getValue(),
        email: 'user@example.com',
        passwordHash: 'hashed_pw',
        fullName: 'User Name',
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const user = await repo.findById(id);

      expect(user).not.toBeNull();
      expect(user?.id.getValue()).toBe(id.getValue());
      expect(user?.email.getValue()).toBe('user@example.com');
      expect(user?.fullName).toBe('User Name');
    });

    it('should return null when findById finds nothing', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValueOnce(null);
      const user = await repo.findById(UserId.create());
      expect(user).toBeNull();
    });

    it('should findByEmail', async () => {
      const email = Email.create('user@example.com');
      const id = UserId.create();
      mockPrisma.userAccount.findUnique.mockResolvedValueOnce({
        id: id.getValue(),
        email: email.getValue(),
        passwordHash: 'hash',
        fullName: 'Name',
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const user = await repo.findByEmail(email);
      expect(user).not.toBeNull();
      expect(user?.email.getValue()).toBe(email.getValue());
    });

    it('should findAll with pagination and filters', async () => {
      const id = UserId.create();
      mockPrisma.userAccount.findMany.mockResolvedValueOnce([
        {
          id: id.getValue(),
          email: 'a@example.com',
          passwordHash: 'hash',
          fullName: 'A',
          isActive: true,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      mockPrisma.userAccount.count.mockResolvedValueOnce(1);

      const result = await repo.findAll({
        isActive: true,
        emailVerified: false,
        sortBy: 'email',
        sortOrder: 'asc',
        limit: 10,
        offset: 0,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].email.getValue()).toBe('a@example.com');
    });

    it('should delete by id', async () => {
      const id = UserId.create();
      await repo.delete(id);
      expect(mockPrisma.userAccount.delete).toHaveBeenCalledWith({
        where: { id: id.getValue() },
      });
    });

    it('should check exists and existsByEmail', async () => {
      mockPrisma.userAccount.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

      const exists1 = await repo.exists(UserId.create());
      const exists2 = await repo.existsByEmail(Email.create('none@example.com'));

      expect(exists1).toBe(true);
      expect(exists2).toBe(false);
    });

    it('should count users', async () => {
      mockPrisma.userAccount.count.mockResolvedValueOnce(42);
      const count = await repo.count();
      expect(count).toBe(42);
    });

    it('should check sharesWorkspace correctly', async () => {
      const actorId = UserId.create();
      const targetId = UserId.create();

      mockPrisma.workspaceMembership.findFirst.mockResolvedValueOnce({ id: randomUUID() });
      const shares = await repo.sharesWorkspace(actorId, targetId);
      expect(shares).toBe(true);
      expect(mockPrisma.workspaceMembership.findFirst).toHaveBeenCalledWith({
        where: {
          userId: targetId.getValue(),
          workspace: {
            isActive: true,
            members: {
              some: { userId: actorId.getValue() },
            },
          },
        },
        select: { id: true },
      });

      mockPrisma.workspaceMembership.findFirst.mockResolvedValueOnce(null);
      const notShares = await repo.sharesWorkspace(actorId, targetId);
      expect(notShares).toBe(false);
    });
  });

  describe('WorkspaceRepositoryImpl', () => {
    let repo: WorkspaceRepositoryImpl;

    beforeEach(() => {
      repo = new WorkspaceRepositoryImpl(mockContext);
    });

    it('should save workspace and persist events', async () => {
      const ownerId = UserId.create();
      const workspace = Workspace.create({
        name: 'My Workspace',
        ownerId: ownerId.getValue(),
      });

      await repo.save(workspace);

      expect(mockContext.execute).toHaveBeenCalledTimes(1);
      expect(mockPrisma.workspace.upsert).toHaveBeenCalledWith({
        where: { id: workspace.id.getValue() },
        create: expect.objectContaining({
          id: workspace.id.getValue(),
          name: 'My Workspace',
          ownerId: ownerId.getValue(),
        }),
        update: expect.objectContaining({
          name: 'My Workspace',
          ownerId: ownerId.getValue(),
        }),
      });
      expect(mockContext.recordEvents).toHaveBeenCalledWith(workspace);
    });

    it('should findById and findBySlug', async () => {
      const wsId = WorkspaceId.create();
      const ownerId = UserId.create();
      mockPrisma.workspace.findUnique.mockResolvedValueOnce({
        id: wsId.getValue(),
        name: 'Engineering',
        slug: 'engineering',
        ownerId: ownerId.getValue(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const ws = await repo.findById(wsId);
      expect(ws).not.toBeNull();
      expect(ws?.slug).toBe('engineering');

      mockPrisma.workspace.findUnique.mockResolvedValueOnce(null);
      const notFound = await repo.findBySlug('unknown');
      expect(notFound).toBeNull();
    });

    it('should findByOwnerId with pagination', async () => {
      const ownerId = UserId.create();
      const wsId = WorkspaceId.create();
      mockPrisma.workspace.findMany.mockResolvedValueOnce([
        {
          id: wsId.getValue(),
          name: 'WS 1',
          slug: 'ws-1',
          ownerId: ownerId.getValue(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      mockPrisma.workspace.count.mockResolvedValueOnce(1);

      const result = await repo.findByOwnerId(ownerId);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].ownerId.getValue()).toBe(ownerId.getValue());
    });

    it('should findByMemberId with pagination', async () => {
      const userId = UserId.create();
      const wsId = WorkspaceId.create();
      const ownerId = UserId.create();
      mockPrisma.workspace.findMany.mockResolvedValueOnce([
        {
          id: wsId.getValue(),
          name: 'WS 1',
          slug: 'ws-1',
          ownerId: ownerId.getValue(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      mockPrisma.workspace.count.mockResolvedValueOnce(1);

      const result = await repo.findByMemberId(userId);
      expect(result.items).toHaveLength(1);
      expect(mockPrisma.workspace.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            members: { some: { userId: userId.getValue() } },
            isActive: true,
          },
        }),
      );
    });

    it('should delete, exists, existsBySlug, and count', async () => {
      const wsId = WorkspaceId.create();
      await repo.delete(wsId);
      expect(mockPrisma.workspace.delete).toHaveBeenCalledWith({
        where: { id: wsId.getValue() },
      });

      mockPrisma.workspace.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(5);

      expect(await repo.exists(wsId)).toBe(true);
      expect(await repo.existsBySlug('none')).toBe(false);
      expect(await repo.count()).toBe(5);
    });
  });

  describe('WorkspaceMembershipRepositoryImpl', () => {
    let repo: WorkspaceMembershipRepositoryImpl;

    beforeEach(() => {
      repo = new WorkspaceMembershipRepositoryImpl(mockContext);
    });

    it('should save membership and persist events', async () => {
      const membership = WorkspaceMembership.create({
        userId: UserId.create().getValue(),
        workspaceId: WorkspaceId.create().getValue(),
        role: WorkspaceRole.ADMIN,
      });

      await repo.save(membership);

      expect(mockContext.execute).toHaveBeenCalledTimes(1);
      expect(mockPrisma.workspaceMembership.upsert).toHaveBeenCalledWith({
        where: { id: membership.id.getValue() },
        create: expect.objectContaining({
          id: membership.id.getValue(),
          role: WorkspaceRole.ADMIN,
        }),
        update: expect.objectContaining({
          role: WorkspaceRole.ADMIN,
        }),
      });
      expect(mockContext.recordEvents).toHaveBeenCalledWith(membership);
    });

    it('should findById and findByUserAndWorkspace', async () => {
      const memId = MembershipId.create();
      const userId = UserId.create();
      const wsId = WorkspaceId.create();

      mockPrisma.workspaceMembership.findUnique.mockResolvedValueOnce({
        id: memId.getValue(),
        userId: userId.getValue(),
        workspaceId: wsId.getValue(),
        role: WorkspaceRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mem = await repo.findById(memId);
      expect(mem).not.toBeNull();
      expect(mem?.role).toBe(WorkspaceRole.MEMBER);

      mockPrisma.workspaceMembership.findUnique.mockResolvedValueOnce(null);
      const notFound = await repo.findByUserAndWorkspace(userId, wsId);
      expect(notFound).toBeNull();
    });

    it('should findByUserId and findByWorkspaceId', async () => {
      const userId = UserId.create();
      const wsId = WorkspaceId.create();

      mockPrisma.workspaceMembership.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      mockPrisma.workspaceMembership.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const byUser = await repo.findByUserId(userId);
      const byWs = await repo.findByWorkspaceId(wsId);

      expect(byUser.items).toHaveLength(0);
      expect(byWs.items).toHaveLength(0);
    });

    it('should delete, exists, and countByWorkspaceId', async () => {
      const memId = MembershipId.create();
      const userId = UserId.create();
      const wsId = WorkspaceId.create();

      await repo.delete(memId);
      expect(mockPrisma.workspaceMembership.delete).toHaveBeenCalledWith({
        where: { id: memId.getValue() },
      });

      mockPrisma.workspaceMembership.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(3);

      expect(await repo.exists(userId, wsId)).toBe(true);
      expect(await repo.countByWorkspaceId(wsId)).toBe(3);
    });
  });

  describe('WorkspaceInvitationRepositoryImpl', () => {
    let repo: WorkspaceInvitationRepositoryImpl;

    beforeEach(() => {
      repo = new WorkspaceInvitationRepositoryImpl(mockContext);
    });

    it('should save invitation and persist events', async () => {
      const wsId = WorkspaceId.create();
      const invitation = WorkspaceInvitation.create({
        workspaceId: wsId.getValue(),
        email: 'invitee@example.com',
        role: WorkspaceRole.MEMBER,
      });

      await repo.save(invitation);

      expect(mockContext.execute).toHaveBeenCalledTimes(1);
      expect(mockPrisma.workspaceInvitation.upsert).toHaveBeenCalledWith({
        where: { id: invitation.id.getValue() },
        create: expect.objectContaining({
          id: invitation.id.getValue(),
          email: 'invitee@example.com',
          role: WorkspaceRole.MEMBER,
        }),
        update: expect.objectContaining({
          role: WorkspaceRole.MEMBER,
        }),
      });
      expect(mockContext.recordEvents).toHaveBeenCalledWith(invitation);
    });

    it('should findById and findByToken', async () => {
      const invId = InvitationId.create();
      const wsId = WorkspaceId.create();
      mockPrisma.workspaceInvitation.findUnique.mockResolvedValueOnce({
        id: invId.getValue(),
        workspaceId: wsId.getValue(),
        email: 'a@b.com',
        role: WorkspaceRole.MEMBER,
        token: 'token123',
        expiresAt: new Date(Date.now() + 10000),
        acceptedAt: null,
        cancelledAt: null,
        createdAt: new Date(),
      });

      const inv = await repo.findById(invId);
      expect(inv).not.toBeNull();
      expect(inv?.email).toBe('a@b.com');

      mockPrisma.workspaceInvitation.findUnique.mockResolvedValueOnce(null);
      const notFound = await repo.findByToken('nonexistent');
      expect(notFound).toBeNull();
    });

    it('should findByWorkspaceId and findByEmail (supporting string and VO)', async () => {
      const wsId = WorkspaceId.create();
      mockPrisma.workspaceInvitation.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      mockPrisma.workspaceInvitation.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const byWs = await repo.findByWorkspaceId(wsId);
      const byEmailStr = await repo.findByEmail('test@example.com');

      expect(byWs.items).toHaveLength(0);
      expect(byEmailStr.items).toHaveLength(0);
    });

    it('should findPendingByWorkspaceId and findPendingByWorkspaceAndEmail', async () => {
      const wsId = WorkspaceId.create();
      const invId = InvitationId.create();
      mockPrisma.workspaceInvitation.findMany.mockResolvedValueOnce([]);
      mockPrisma.workspaceInvitation.count.mockResolvedValueOnce(0);

      const pending = await repo.findPendingByWorkspaceId(wsId);
      expect(pending.items).toHaveLength(0);

      mockPrisma.workspaceInvitation.findFirst.mockResolvedValueOnce({
        id: invId.getValue(),
        workspaceId: wsId.getValue(),
        email: 'test@example.com',
        role: WorkspaceRole.ADMIN,
        token: 'token456',
        expiresAt: new Date(Date.now() + 10000),
        acceptedAt: null,
        cancelledAt: null,
        createdAt: new Date(),
      });

      const foundPending = await repo.findPendingByWorkspaceAndEmail(wsId, 'test@example.com');
      expect(foundPending).not.toBeNull();
      expect(foundPending?.role).toBe(WorkspaceRole.ADMIN);
    });

    it('should delete and deleteExpired', async () => {
      const invId = InvitationId.create();
      await repo.delete(invId);
      expect(mockPrisma.workspaceInvitation.delete).toHaveBeenCalledWith({
        where: { id: invId.getValue() },
      });

      mockPrisma.workspaceInvitation.deleteMany.mockResolvedValueOnce({ count: 7 });
      const deletedCount = await repo.deleteExpired();
      expect(deletedCount).toBe(7);
    });

    it('should atomically acceptInvitationTransaction', async () => {
      const wsId = WorkspaceId.create();
      const invitation = WorkspaceInvitation.create({
        workspaceId: wsId.getValue(),
        email: 'accept@example.com',
        role: WorkspaceRole.MEMBER,
      });
      invitation.accept();

      const membership = WorkspaceMembership.create({
        userId: UserId.create().getValue(),
        workspaceId: wsId.getValue(),
        role: WorkspaceRole.MEMBER,
      });

      mockPrisma.workspaceInvitation.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.workspaceMembership.create.mockResolvedValueOnce({});

      await repo.acceptInvitationTransaction(invitation, membership);

      expect(mockContext.execute).toHaveBeenCalledTimes(1);
      expect(mockPrisma.workspaceInvitation.updateMany).toHaveBeenCalledWith({
        where: {
          id: invitation.id.getValue(),
          acceptedAt: null,
          cancelledAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
        data: {
          acceptedAt: invitation.acceptedAt,
        },
      });
      expect(mockPrisma.workspaceMembership.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: membership.id.getValue(),
          role: WorkspaceRole.MEMBER,
        }),
      });
      expect(mockContext.recordEvents).toHaveBeenCalledWith(invitation);
      expect(mockContext.recordEvents).toHaveBeenCalledWith(membership);
    });

    it('should throw InvitationAlreadyAcceptedError when acceptInvitationTransaction update count is not 1', async () => {
      const wsId = WorkspaceId.create();
      const invitation = WorkspaceInvitation.create({
        workspaceId: wsId.getValue(),
        email: 'race@example.com',
        role: WorkspaceRole.MEMBER,
      });
      invitation.accept();

      const membership = WorkspaceMembership.create({
        userId: UserId.create().getValue(),
        workspaceId: wsId.getValue(),
        role: WorkspaceRole.MEMBER,
      });

      mockPrisma.workspaceInvitation.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        repo.acceptInvitationTransaction(invitation, membership),
      ).rejects.toThrow(InvitationAlreadyAcceptedError);
    });
  });
});
