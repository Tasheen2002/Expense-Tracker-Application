import { describe, expect, it, vi } from 'vitest';
import { LoginUserHandler } from '../application/commands/login-user.command';
import { UserManagementService } from '../application/services/user-management.service';
import { ISessionService } from '../application/services/session.service';
import { InvalidCredentialsError, UserInactiveError } from '../domain/errors/identity.errors';

describe('LoginUserHandler', () => {
  const credentials = { email: 'user@example.com', password: 'password123' };
  const user = {
    id: { getValue: () => 'user-1' },
    email: { getValue: () => credentials.email },
    fullName: 'Test User',
    isActive: true,
    emailVerified: true,
  };

  function createHandler(verifiedUser: typeof user | null) {
    const users = { verifyPassword: vi.fn().mockResolvedValue(verifiedUser) };
    const sessions = { createSession: vi.fn().mockResolvedValue({ sessionId: 'session-1' }) };
    const handler = new LoginUserHandler(
      users as unknown as UserManagementService,
      sessions as unknown as ISessionService
    );
    return { handler, users, sessions };
  }

  it('creates the session as part of the login command', async () => {
    const { handler, users, sessions } = createHandler(user);

    await expect(handler.handle(credentials)).resolves.toEqual({
      user: {
        userId: 'user-1',
        email: credentials.email,
        fullName: 'Test User',
        isActive: true,
        emailVerified: true,
      },
      sessionId: 'session-1',
    });
    expect(users.verifyPassword).toHaveBeenCalledWith(credentials.email, credentials.password);
    expect(sessions.createSession).toHaveBeenCalledWith('user-1');
  });

  it('does not create a session for invalid credentials or inactive users', async () => {
    const invalid = createHandler(null);
    await expect(invalid.handler.handle(credentials)).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(invalid.sessions.createSession).not.toHaveBeenCalled();

    const inactive = createHandler({ ...user, isActive: false });
    await expect(inactive.handler.handle(credentials)).rejects.toBeInstanceOf(UserInactiveError);
    expect(inactive.sessions.createSession).not.toHaveBeenCalled();
  });
});
