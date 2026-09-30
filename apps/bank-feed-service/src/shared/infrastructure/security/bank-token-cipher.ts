import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const PREFIX = 'enc:v1:';

/** Authenticated encryption bound to the connection and workspace. */
export class BankTokenCipher {
  private readonly key: Buffer;

  constructor(encodedKey: string | undefined) {
    const key = encodedKey ? Buffer.from(encodedKey, 'base64') : Buffer.alloc(0);
    if (key.length !== 32) {
      throw new Error('BANK_FEED_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
    }
    this.key = key;
  }

  encrypt(token: string, connectionId: string, workspaceId: string): string {
    if (!token) return '';
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(`${workspaceId}:${connectionId}`, 'utf8'));
    const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    return `${PREFIX}${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${ciphertext.toString('base64')}`;
  }

  decrypt(value: string, connectionId: string, workspaceId: string): string {
    if (!value || !value.startsWith(PREFIX)) return value;
    const [ivValue, tagValue, ciphertextValue] = value.slice(PREFIX.length).split(':');
    if (!ivValue || !tagValue || !ciphertextValue) throw new Error('Invalid encrypted bank token');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivValue, 'base64'));
    decipher.setAAD(Buffer.from(`${workspaceId}:${connectionId}`, 'utf8'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }
}
