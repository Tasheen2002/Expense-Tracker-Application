import { User } from "../entities/user.entity";
import { UserId } from "../value-objects/user-id.vo";
import { Email } from "../value-objects/email.vo";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface IUserRepository {
  save(user: User): Promise<void>;
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  findAll(options?: UserQueryOptions): Promise<PaginatedResult<User>>;
  update(user: User): Promise<void>;
  delete(id: UserId): Promise<void>;
  exists(id: UserId): Promise<boolean>;
  existsByEmail(email: Email): Promise<boolean>;
  count(): Promise<number>;
}

export interface UserQueryOptions extends PaginationOptions {
  isActive?: boolean;
  emailVerified?: boolean;
  sortBy?: "email" | "fullName" | "createdAt";
  sortOrder?: "asc" | "desc";
}
