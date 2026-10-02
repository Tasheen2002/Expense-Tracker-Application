import { describe, expect, it } from 'vitest';
import { BankTokenCipher } from '../../../shared/infrastructure/security/bank-token-cipher';
import { encryptExistingTokens } from '../../../../scripts/encrypt-existing-tokens';
import { PrismaClient } from '@prisma/client';
import { vi } from 'vitest';

describe('bank token encryption', () => {
  const cipher = new BankTokenCipher(Buffer.alloc(32, 3).toString('base64'));

  it('encrypts token values and binds them to one connection', () => {
    const encrypted = cipher.encrypt('provider-secret', 'connection-1', 'workspace-1');
    expect(encrypted).toMatch(/^enc:v1:/);
    expect(encrypted).not.toContain('provider-secret');
    expect(cipher.decrypt(encrypted, 'connection-1', 'workspace-1')).toBe('provider-secret');
    expect(() => cipher.decrypt(encrypted, 'connection-2', 'workspace-1')).toThrow();
  });

  it('accepts legacy plaintext for the one-time encryption migration', () => {
    expect(cipher.decrypt('legacy-secret', 'connection-1', 'workspace-1')).toBe('legacy-secret');
  });

  it('rejects missing or short keys', () => {
    expect(() => new BankTokenCipher(undefined)).toThrow('32-byte key');
    expect(() => new BankTokenCipher(Buffer.alloc(16).toString('base64'))).toThrow('32-byte key');
  });

  it('uses bounded pages and never overwrites a token rotated after the migration read', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const findMany = vi.fn().mockResolvedValueOnce([
      { id: 'connection-1', workspaceId: 'workspace-1', accessToken: 'legacy-secret' },
      { id: 'connection-2', workspaceId: 'workspace-1', accessToken: 'enc:v1:existing' },
    ]).mockResolvedValueOnce([]);
    const prisma = { bankConnection: { findMany, updateMany } } as unknown as PrismaClient;
    expect(await encryptExistingTokens(prisma, cipher)).toBe(0);
    expect(updateMany).toHaveBeenCalledOnce();
    expect(updateMany.mock.calls[0][0].where).toEqual({ id: 'connection-1', workspaceId: 'workspace-1', accessToken: 'legacy-secret' });
    expect(updateMany.mock.calls[0][0].data.accessToken).toMatch(/^enc:v1:/);
    expect(findMany.mock.calls[0][0].take).toBe(100);
    expect(findMany.mock.calls[1][0].where).toEqual({ id: { gt: 'connection-2' } });
  });
});
