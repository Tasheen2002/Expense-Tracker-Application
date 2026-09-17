import { ISessionRepository, SessionRecord } from '../../domain/repositories/session.repository';
import { IdentityPersistenceContext } from '@shared/infrastructure/persistence/identity-persistence.context';

export class SessionRepositoryImpl implements ISessionRepository {
  constructor(private readonly context: IdentityPersistenceContext) {}

  async create(data: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<SessionRecord> {
    const session = await this.context.client.authSession.create({
      data: {
        id: data.id,
        userId: data.userId,
        token: data.token,
        expiresAt: data.expiresAt,
      },
    });

    return {
      id: session.id,
      userId: session.userId,
      token: session.token,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    };
  }

  async findByToken(token: string): Promise<SessionRecord | null> {
    const session = await this.context.client.authSession.findUnique({
      where: { token },
    });

    if (!session) {
      return null;
    }

    return {
      id: session.id,
      userId: session.userId,
      token: session.token,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    };
  }

  async deleteByToken(token: string): Promise<void> {
    await this.context.client.authSession.deleteMany({
      where: { token },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.context.client.authSession.deleteMany({
      where: {
        expiresAt: { lte: new Date() },
      },
    });
    return result.count;
  }
}
