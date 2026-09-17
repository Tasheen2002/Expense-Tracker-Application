import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionService, parseDurationMs } from '../application/services/session.service';
import { ISessionRepository, SessionRecord } from '../domain/repositories/session.repository';

describe('SessionService (Unit)', () => {
  let sessionService: SessionService;
  let mockSessionRepository: ISessionRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionRepository = {
      create: vi.fn(),
      findByToken: vi.fn(),
      deleteByToken: vi.fn(),
      deleteExpired: vi.fn(),
    };
    sessionService = new SessionService(mockSessionRepository);
  });

  describe('parseDurationMs', () => {
    it('should parse days, hours, minutes, and seconds correctly', () => {
      expect(parseDurationMs('7d')).toBe(7 * 24 * 60 * 60 * 1000);
      expect(parseDurationMs('24h')).toBe(24 * 60 * 60 * 1000);
      expect(parseDurationMs('30m')).toBe(30 * 60 * 1000);
      expect(parseDurationMs('60s')).toBe(60 * 1000);
      expect(parseDurationMs(5000)).toBe(5000);
      expect(parseDurationMs(undefined)).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });

  describe('createSession', () => {
    it('should create an auth session and return sessionId', async () => {
      const mockCreated: SessionRecord = {
        id: 'sess-123',
        userId: 'user-123',
        token: 'sess-123',
        expiresAt: new Date(),
        createdAt: new Date(),
      };
      (mockSessionRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockCreated);

      const result = await sessionService.createSession('user-123', 7);

      expect(result).toHaveProperty('sessionId');
      expect(typeof result.sessionId).toBe('string');
      expect(mockSessionRepository.create).toHaveBeenCalledWith({
        id: result.sessionId,
        userId: 'user-123',
        token: result.sessionId,
        expiresAt: expect.any(Date),
      });
    });

    it('should use JWT_EXPIRES_IN if no ttl is passed', async () => {
      process.env.JWT_EXPIRES_IN = '24h';
      (mockSessionRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue({} as SessionRecord);

      const before = Date.now();
      await sessionService.createSession('user-456');
      const after = Date.now();

      expect(mockSessionRepository.create).toHaveBeenCalled();
      const callArgs = (mockSessionRepository.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const expiresAtMs = callArgs.expiresAt.getTime();
      const expectedMin = before + 24 * 60 * 60 * 1000;
      const expectedMax = after + 24 * 60 * 60 * 1000;
      expect(expiresAtMs).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAtMs).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe('revokeSession', () => {
    it('should delete auth session by token', async () => {
      (mockSessionRepository.deleteByToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await sessionService.revokeSession('sess-123');

      expect(mockSessionRepository.deleteByToken).toHaveBeenCalledWith('sess-123');
    });
  });

  describe('isSessionValid', () => {
    it('should return true if session exists and is not expired', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      (mockSessionRepository.findByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sess-123',
        userId: 'user-123',
        token: 'sess-123',
        expiresAt: futureDate,
        createdAt: new Date(),
      });

      const isValid = await sessionService.isSessionValid('sess-123');

      expect(isValid).toBe(true);
      expect(mockSessionRepository.findByToken).toHaveBeenCalledWith('sess-123');
    });

    it('should return false if session does not exist', async () => {
      (mockSessionRepository.findByToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const isValid = await sessionService.isSessionValid('non-existent');

      expect(isValid).toBe(false);
    });

    it('should return false and revoke if session is expired', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      (mockSessionRepository.findByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sess-expired',
        userId: 'user-123',
        token: 'sess-expired',
        expiresAt: pastDate,
        createdAt: new Date(),
      });
      (mockSessionRepository.deleteByToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const isValid = await sessionService.isSessionValid('sess-expired');

      expect(isValid).toBe(false);
      expect(mockSessionRepository.deleteByToken).toHaveBeenCalledWith('sess-expired');
    });
  });
});
