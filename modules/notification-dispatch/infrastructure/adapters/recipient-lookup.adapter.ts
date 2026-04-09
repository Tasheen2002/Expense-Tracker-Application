import { IRecipientLookup } from '../../domain/repositories/recipient-lookup';
import { UserId } from '../../domain/value-objects';
import { PrismaClient } from '@prisma/client';

export class PrismaRecipientLookupAdapter implements IRecipientLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async findEmail(userId: UserId): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId.getValue() },
      select: { email: true },
    });
    return user?.email ?? null;
  }
}
