import { UserId } from '../value-objects';

/**
 * Port interface — lets NotificationService resolve a recipient's email address
 * without directly depending on identity-workspace's IUserRepository.
 */
export interface IRecipientLookup {
  findEmail(userId: UserId): Promise<string | null>;
}
