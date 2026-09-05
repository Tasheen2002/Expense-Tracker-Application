import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserManagementService } from '../application/services/user-management.service';
import { IUserRepository } from '../domain/repositories/user.repository';
import { IPasswordHasher } from '../application/ports/password-hasher';
import { User } from '../domain/entities/user.entity';
import { UserAlreadyExistsError, UserNotFoundError } from '../domain/errors/identity.errors';

describe('UserManagementService (Unit Tests)', () => {
  let service: UserManagementService;
  let mockUserRepo: IUserRepository;
  let mockPasswordHasher: IPasswordHasher;

  beforeEach(() => {
    mockUserRepo = {
      sharesWorkspace: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findAll: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn(),
      existsByEmail: vi.fn(),
      count: vi.fn().mockResolvedValue(1),
    };

    mockPasswordHasher = {
      hash: vi.fn().mockImplementation(async (pw: string) => `hashed_${pw}`),
      verify: vi.fn().mockImplementation(async (plain: string, hash: string) => hash === `hashed_${plain}`),
    };

    service = new UserManagementService(mockUserRepo, mockPasswordHasher);
  });

  describe('createUser & createUserDTO', () => {
    it('should create and save a new user successfully', async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);

      const dto = await service.createUserDTO({
        email: 'john@example.com',
        passwordHash: 'hashed_password123',
        fullName: 'John Doe',
      });

      expect(dto.email).toBe('john@example.com');
      expect(dto.fullName).toBe('John Doe');
      expect(dto.isActive).toBe(true);
      expect(dto.emailVerified).toBe(false);
      expect(mockUserRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should throw UserAlreadyExistsError when email is taken', async () => {
      const existing = User.create({
        email: 'john@example.com',
        passwordHash: 'hash',
      });
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(existing);

      await expect(
        service.createUser({
          email: 'john@example.com',
          passwordHash: 'hashed_password123',
        })
      ).rejects.toThrow(UserAlreadyExistsError);
    });
  });

  describe('registerUser & registerUserDTO', () => {
    it('should hash plain password before saving', async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);

      const dto = await service.registerUserDTO({
        email: 'alice@example.com',
        password: 'securePassword1',
        fullName: 'Alice Smith',
      });

      expect(mockPasswordHasher.hash).toHaveBeenCalledWith('securePassword1');
      expect(dto.email).toBe('alice@example.com');
      expect(mockUserRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUserById & getUserDTOById', () => {
    it('should return null if user does not exist', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

      const result = await service.getUserDTOById('123e4567-e89b-42d3-a456-426614174000');
      expect(result).toBeNull();
    });

    it('should return UserDTO when user exists', async () => {
      const user = User.create({
        email: 'test@example.com',
        passwordHash: 'hash',
        fullName: 'Test User',
      });
      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);

      const result = await service.getUserDTOById(user.id.getValue());
      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@example.com');
      expect(result?.fullName).toBe('Test User');
    });
  });

  describe('getUsers & getUsersDTO', () => {
    it('should return paginated DTO results', async () => {
      const user = User.create({
        email: 'test@example.com',
        passwordHash: 'hash',
      });
      vi.mocked(mockUserRepo.findAll).mockResolvedValue({
        items: [user],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      const result = await service.getUsersDTO({ page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].email).toBe('test@example.com');
      expect(result.total).toBe(1);
    });
  });

  describe('updateUser & updateUserDTO', () => {
    it('should throw UserNotFoundError if user does not exist', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

      await expect(
        service.updateUser('123e4567-e89b-42d3-a456-426614174000', { fullName: 'New Name' })
      ).rejects.toThrow(UserNotFoundError);
    });

    it('should update full name and email', async () => {
      const user = User.create({
        email: 'old@example.com',
        passwordHash: 'hash',
        fullName: 'Old Name',
      });
      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);

      const updated = await service.updateUserDTO(user.id.getValue(), {
        fullName: 'New Name',
        email: 'new@example.com',
      });

      expect(updated.fullName).toBe('New Name');
      expect(updated.email).toBe('new@example.com');
      expect(mockUserRepo.save).toHaveBeenCalled();
    });

    it('should throw UserAlreadyExistsError if new email belongs to someone else', async () => {
      const user1 = User.create({
        email: 'user1@example.com',
        passwordHash: 'hash',
      });
      const user2 = User.create({
        email: 'user2@example.com',
        passwordHash: 'hash',
      });
      vi.mocked(mockUserRepo.findById).mockResolvedValue(user1);
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(user2);

      await expect(
        service.updateUser(user1.id.getValue(), { email: 'user2@example.com' })
      ).rejects.toThrow(UserAlreadyExistsError);
    });
  });

  describe('updatePassword & updatePasswordDTO', () => {
    it('should hash and update password', async () => {
      const user = User.create({
        email: 'test@example.com',
        passwordHash: 'old_hash',
      });
      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);

      await service.updatePassword(user.id.getValue(), 'newPassword123');
      expect(mockPasswordHasher.hash).toHaveBeenCalledWith('newPassword123');
      expect(user.passwordHash).toBe('hashed_newPassword123');
      expect(mockUserRepo.save).toHaveBeenCalled();
    });
  });

  describe('verifyEmail & verifyEmailDTO', () => {
    it('should set emailVerified to true', async () => {
      const user = User.create({
        email: 'test@example.com',
        passwordHash: 'hash',
      });
      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);

      const dto = await service.verifyEmailDTO(user.id.getValue());
      expect(dto.emailVerified).toBe(true);
      expect(mockUserRepo.save).toHaveBeenCalled();
    });
  });

  describe('deactivateUser & activateUser', () => {
    it('should toggle user active state', async () => {
      const user = User.create({
        email: 'test@example.com',
        passwordHash: 'hash',
      });
      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);

      const deactivated = await service.deactivateUserDTO(user.id.getValue());
      expect(deactivated.isActive).toBe(false);

      const activated = await service.activateUserDTO(user.id.getValue());
      expect(activated.isActive).toBe(true);
    });
  });

  describe('deleteUser', () => {
    it('should throw UserNotFoundError if user does not exist', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

      await expect(
        service.deleteUser('123e4567-e89b-42d3-a456-426614174000')
      ).rejects.toThrow(UserNotFoundError);
    });

    it('should delete existing user', async () => {
      const user = User.create({
        email: 'test@example.com',
        passwordHash: 'hash',
      });
      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);

      await service.deleteUser(user.id.getValue());
      expect(mockUserRepo.delete).toHaveBeenCalledWith(user.id);
    });
  });

  describe('verifyPassword', () => {
    it('should return null if user does not exist', async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);

      const result = await service.verifyPassword('missing@example.com', 'pw');
      expect(result).toBeNull();
    });

    it('should return null if password does not match', async () => {
      const user = User.create({
        email: 'test@example.com',
        passwordHash: 'hashed_correctpw',
      });
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(user);

      const result = await service.verifyPassword('test@example.com', 'wrongpw');
      expect(result).toBeNull();
    });

    it('should return user if password matches', async () => {
      const user = User.create({
        email: 'test@example.com',
        passwordHash: 'hashed_mypassword',
      });
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(user);

      const result = await service.verifyPassword('test@example.com', 'mypassword');
      expect(result).toBe(user);
    });
  });
});
