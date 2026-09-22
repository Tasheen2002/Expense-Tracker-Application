import { ISessionRepository } from '../../domain/repositories/session.repository';
import { v4 as uuidv4 } from 'uuid';

export function parseDurationMs(
  durationStr: string | number | undefined,
  defaultMs = 7 * 24 * 60 * 60 * 1000
): number {
  if (typeof durationStr === 'number') {
    return durationStr > 0 ? durationStr : defaultMs;
  }
  if (!durationStr || typeof durationStr !== 'string') {
    return defaultMs;
  }
  const match = durationStr.trim().match(/^(\d+)\s*(d|h|m|s)?$/i);
  if (!match) {
    return defaultMs;
  }
  const value = parseInt(match[1], 10);
  const unit = (match[2] || 'ms').toLowerCase();
  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'm':
      return value * 60 * 1000;
    case 's':
      return value * 1000;
    default:
      return value;
  }
}

export interface ISessionService {
  createSession(userId: string, ttlMsOrDays?: number | string): Promise<{ sessionId: string }>;
  revokeSession(sessionId: string): Promise<void>;
  isSessionValid(sessionId: string): Promise<boolean>;
}

export class SessionService implements ISessionService {
  constructor(private readonly sessionRepository: ISessionRepository) {}

  async createSession(userId: string, ttlMsOrDays?: number | string): Promise<{ sessionId: string }> {
    const sessionId = uuidv4();
    let ttlMs: number;

    if (typeof ttlMsOrDays === 'number') {
      // Small integers (e.g. 7) treated as days for backwards compatibility
      ttlMs = ttlMsOrDays < 1000 ? ttlMsOrDays * 24 * 60 * 60 * 1000 : ttlMsOrDays;
    } else if (typeof ttlMsOrDays === 'string') {
      ttlMs = parseDurationMs(ttlMsOrDays);
    } else {
      ttlMs = parseDurationMs(process.env.JWT_EXPIRES_IN || '7d');
    }

    const expiresAt = new Date(Date.now() + ttlMs);

    await this.sessionRepository.create({
      id: sessionId,
      userId,
      token: sessionId,
      expiresAt,
    });

    return { sessionId };
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionRepository.deleteByToken(sessionId);
  }

  async isSessionValid(sessionId: string): Promise<boolean> {
    const session = await this.sessionRepository.findByToken(sessionId);

    if (!session) {
      return false;
    }

    if (session.expiresAt <= new Date()) {
      await this.revokeSession(sessionId).catch(() => {});
      return false;
    }

    return true;
  }
}
