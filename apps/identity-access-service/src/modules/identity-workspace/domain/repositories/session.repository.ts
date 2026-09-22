export interface SessionRecord {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface ISessionRepository {
  create(data: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<SessionRecord>;
  findByToken(token: string): Promise<SessionRecord | null>;
  deleteByToken(token: string): Promise<void>;
  deleteExpired(): Promise<number>;
}
