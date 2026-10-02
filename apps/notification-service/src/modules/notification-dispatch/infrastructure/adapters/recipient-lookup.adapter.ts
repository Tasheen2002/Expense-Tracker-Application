import { IRecipientLookup } from '../../domain/repositories/recipient-lookup';
import { UserId } from '@core/domain/value-objects';
import { z } from 'zod';

export class PrismaRecipientLookupAdapter implements IRecipientLookup {
  constructor() {}

  async findEmail(userId: UserId): Promise<string | null> {
    const identityServiceUrl = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3002';
    const key = process.env.INTERNAL_API_KEY;
    if (!key) throw new Error('Recipient lookup service credentials are not configured');
    const configuredTimeout = Number(process.env.IDENTITY_SERVICE_TIMEOUT_MS ?? 5000);
    const timeout = Number.isInteger(configuredTimeout) && configuredTimeout >= 100 && configuredTimeout <= 30000 ? configuredTimeout : 5000;
    const response = await fetch(`${identityServiceUrl.replace(/\/$/, '')}/api/v1/users/${userId.getValue()}`, {
      // Identity authorizes the active actor even for authenticated internal calls.
      headers: { 'x-internal-api-key': key, 'x-user-id': userId.getValue() }, signal: AbortSignal.timeout(timeout),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Recipient lookup failed with status ${response.status}`);
    const parsed = z.object({ data: z.object({ userId: z.string().uuid(), email: z.string().email() }) }).safeParse(await response.json());
    if (!parsed.success || parsed.data.data.userId.toLowerCase() !== userId.getValue()) {
      throw new Error('Recipient lookup returned invalid or mismatched user data');
    }
    return parsed.data.data.email;
  }
}

