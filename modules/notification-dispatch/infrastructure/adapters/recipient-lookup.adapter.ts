import { IRecipientLookup } from '../../domain/repositories/recipient-lookup';
import { UserId } from '../../domain/value-objects';
import { IUserRepository } from '../../../identity-workspace/domain/repositories/user.repository';

export class PrismaRecipientLookupAdapter implements IRecipientLookup {
  constructor(private readonly userRepository: IUserRepository) {}

  async findEmail(userId: UserId): Promise<string | null> {
    const user = await this.userRepository.findById(userId);
    return user?.getEmail().getValue() ?? null;
  }
}
