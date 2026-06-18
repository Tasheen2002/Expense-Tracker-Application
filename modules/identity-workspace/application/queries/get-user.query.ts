import { UserManagementService } from '../services/user-management.service';
import { UserDTO } from '../../domain/entities/user.entity';
import {
  UserLookupCriteriaRequiredError,
  UserNotFoundError,
} from '../../domain/errors/identity.errors';
import { IQuery, IQueryHandler } from '@core/application/cqrs';

export interface GetUserQuery extends IQuery {
  readonly userId?: string;
  readonly email?: string;
}

export class GetUserHandler implements IQueryHandler<
  GetUserQuery,
  UserDTO
> {
  constructor(private readonly userManagementService: UserManagementService) {}

  async handle(query: GetUserQuery): Promise<UserDTO> {
    if (!query.userId && !query.email) {
      throw new UserLookupCriteriaRequiredError();
    }

    let userDTO: UserDTO | null = null;
    if (query.userId) {
      userDTO = await this.userManagementService.getUserDTOById(query.userId);
    } else if (query.email) {
      userDTO = await this.userManagementService.getUserDTOByEmail(query.email);
    }

    if (!userDTO) {
      throw new UserNotFoundError(query.userId ?? query.email!);
    }

    return userDTO;
  }
}
