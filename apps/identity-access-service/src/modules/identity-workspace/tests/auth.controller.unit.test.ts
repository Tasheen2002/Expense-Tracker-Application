import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthController } from '../infrastructure/http/controllers/auth.controller';
import { FastifyReply, FastifyRequest } from 'fastify';
import { CommandResult } from '@core/application/cqrs';

const mockRegisterUserHandler = {
  handle: vi.fn(),
};

const mockLoginUserHandler = {
  handle: vi.fn(),
};

const mockGetUserHandler = {
  handle: vi.fn(),
};

const mockUpdateProfileHandler = {
  handle: vi.fn(),
};

const mockSessionService = {
  createSession: vi.fn(),
  revokeSession: vi.fn(),
  isSessionValid: vi.fn(),
};

const mockReply = {
  status: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
} as unknown as FastifyReply;

describe('AuthController (Unit)', () => {
  let controller: AuthController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AuthController(
      mockRegisterUserHandler as any,
      mockLoginUserHandler as any,
      mockGetUserHandler as any,
      mockUpdateProfileHandler as any,
      mockSessionService as any
    );
  });

  describe('login', () => {
    it('should authenticate user, create session, and return token with 200 status', async () => {
      const req = {
        body: { email: 'user@example.com', password: 'password123' },
        server: {
          signToken: vi.fn().mockResolvedValue('signed-jwt-token'),
        },
      } as unknown as FastifyRequest<any>;

      const userDto = { userId: 'u-1', email: 'user@example.com', fullName: 'Test User' };
      mockLoginUserHandler.handle.mockResolvedValue(userDto);
      mockSessionService.createSession.mockResolvedValue({ sessionId: 'sess-123' });

      await controller.login(req, mockReply);

      expect(mockLoginUserHandler.handle).toHaveBeenCalledWith(req.body);
      expect(mockSessionService.createSession).toHaveBeenCalledWith('u-1');
      expect(req.server.signToken).toHaveBeenCalledWith({
        userId: 'u-1',
        email: 'user@example.com',
        sessionId: 'sess-123',
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { user: userDto, token: 'signed-jwt-token' },
        })
      );
    });
  });

  describe('register', () => {
    it('should register user and return 201 status', async () => {
      const req = {
        body: { email: 'new@example.com', password: 'password123', fullName: 'New User' },
      } as unknown as FastifyRequest<any>;

      const createdUser = { userId: 'u-2', email: 'new@example.com', fullName: 'New User' };
      mockRegisterUserHandler.handle.mockResolvedValue(CommandResult.success(createdUser));

      await controller.register(req, mockReply);

      expect(mockRegisterUserHandler.handle).toHaveBeenCalledWith(req.body);
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          statusCode: 201,
          data: createdUser,
        })
      );
    });
  });

  describe('me', () => {
    it('should return profile of the authenticated user', async () => {
      const req = {
        user: { userId: 'u-1' },
      } as unknown as FastifyRequest;

      const profile = { userId: 'u-1', email: 'user@example.com', fullName: 'Test' };
      mockGetUserHandler.handle.mockResolvedValue(profile);

      await controller.me(req, mockReply);

      expect(mockGetUserHandler.handle).toHaveBeenCalledWith({
        actorId: 'u-1',
        userId: 'u-1',
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: profile,
        })
      );
    });
  });

  describe('getUser', () => {
    it('should return target user when authorized', async () => {
      const req = {
        user: { userId: 'u-admin' },
        params: { userId: 'u-target' },
      } as unknown as FastifyRequest<any>;

      const targetProfile = { userId: 'u-target', email: 'target@example.com' };
      mockGetUserHandler.handle.mockResolvedValue(targetProfile);

      await controller.getUser(req, mockReply);

      expect(mockGetUserHandler.handle).toHaveBeenCalledWith({
        actorId: 'u-admin',
        userId: 'u-target',
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateProfile', () => {
    it('should update profile and return 200 with updated data', async () => {
      const req = {
        user: { userId: 'u-1' },
        params: { userId: 'u-1' },
        body: { fullName: 'Updated Name' },
      } as unknown as FastifyRequest<any>;

      const updated = { userId: 'u-1', fullName: 'Updated Name' };
      mockUpdateProfileHandler.handle.mockResolvedValue(CommandResult.success(updated));

      await controller.updateProfile(req, mockReply);

      expect(mockUpdateProfileHandler.handle).toHaveBeenCalledWith({
        userId: 'u-1',
        actorId: 'u-1',
        fullName: 'Updated Name',
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });
  });

  describe('logout', () => {
    it('should revoke auth session if sessionId is present and return 204', async () => {
      mockSessionService.revokeSession.mockResolvedValue(undefined);
      const req = {
        user: { userId: 'u-1', sessionId: 'sess-abc-123' },
      } as unknown as FastifyRequest;

      await controller.logout(req, mockReply);

      expect(mockSessionService.revokeSession).toHaveBeenCalledWith('sess-abc-123');
      expect(mockReply.status).toHaveBeenCalledWith(204);
      expect(mockReply.send).toHaveBeenCalled();
    });

    it('should return 204 if no sessionId is provided', async () => {
      const req = {
        user: { userId: 'u-1' },
      } as unknown as FastifyRequest;

      await controller.logout(req, mockReply);

      expect(mockSessionService.revokeSession).not.toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(204);
    });
  });
});
