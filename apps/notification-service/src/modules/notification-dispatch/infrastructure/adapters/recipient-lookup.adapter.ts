import { IRecipientLookup } from '../../domain/repositories/recipient-lookup';
import { UserId } from '@core/domain/value-objects';

export class PrismaRecipientLookupAdapter implements IRecipientLookup {
  constructor() {}

  async findEmail(userId: UserId): Promise<string | null> {
    const identityServiceUrl = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3002';
    try {
      const response = await fetch(`${identityServiceUrl}/api/v1/users/${userId.getValue()}`);
      if (response.ok) {
        const body = await response.json() as any;
        return body.data?.email ?? null;
      }
      return null;
    } catch (error) {
      console.error('Error looking up recipient email via identity service:', error);
      return null;
    }
  }
}

