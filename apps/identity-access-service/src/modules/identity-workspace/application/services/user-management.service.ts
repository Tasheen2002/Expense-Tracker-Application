import { IUserRepository } from '../../domain/repositories/user.repository'
import { User, UserDTO, CreateUserData } from '../../domain/entities/user.entity'
import { UserId } from '../../domain/value-objects/user-id.vo'
import { Email } from '../../domain/value-objects/email.vo'
import { IPasswordHasher } from '../ports/password-hasher'
import {
  UserNotFoundError,
  UserAlreadyExistsError,
} from '../../domain/errors/identity.errors'
import { PaginatedResult, PaginationOptions } from '@core/domain/interfaces/paginated-result.interface'

export interface UserManagementServiceOptions extends PaginationOptions {
  page?: number
  isActive?: boolean
  emailVerified?: boolean
  sortBy?: 'email' | 'fullName' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export class UserManagementService {
  constructor(private readonly userRepository: IUserRepository, private readonly passwords: IPasswordHasher) {}

  async createUser(data: CreateUserData): Promise<User> {
    const email = Email.create(data.email)
    const existingUser = await this.userRepository.findByEmail(email)
    if (existingUser) {
      throw new UserAlreadyExistsError(data.email)
    }

    const user = User.create(data)
    await this.userRepository.save(user)
    return user
  }

  async createUserDTO(data: CreateUserData): Promise<UserDTO> {
    const user = await this.createUser(data)
    return User.toDTO(user)
  }

  async registerUser(data: { email: string; password: string; fullName?: string }): Promise<User> {
    const passwordHash = await this.passwords.hash(data.password)
    return this.createUser({
      email: data.email,
      passwordHash,
      fullName: data.fullName,
    })
  }

  async registerUserDTO(data: { email: string; password: string; fullName?: string }): Promise<UserDTO> {
    const user = await this.registerUser(data)
    return User.toDTO(user)
  }

  async getUserById(id: string): Promise<User | null> {
    const userId = UserId.fromString(id)
    return await this.userRepository.findById(userId)
  }

  async getUserDTOById(id: string): Promise<UserDTO | null> {
    const user = await this.getUserById(id)
    return user ? User.toDTO(user) : null
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const emailVo = Email.create(email)
    return await this.userRepository.findByEmail(emailVo)
  }

  async getUserDTOByEmail(email: string): Promise<UserDTO | null> {
    const user = await this.getUserByEmail(email)
    return user ? User.toDTO(user) : null
  }

  async getUsers(options: UserManagementServiceOptions = {}): Promise<PaginatedResult<User>> {
    const {
      page = 1,
      limit = 50,
      offset,
      isActive,
      emailVerified,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options

    const repositoryOptions = {
      limit,
      offset: offset !== undefined ? offset : (page - 1) * limit,
      isActive,
      emailVerified,
      sortBy,
      sortOrder,
    }

    return await this.userRepository.findAll(repositoryOptions)
  }

  async getUsersDTO(options: UserManagementServiceOptions = {}): Promise<PaginatedResult<UserDTO>> {
    const result = await this.getUsers(options)
    return {
      ...result,
      items: result.items.map((user) => User.toDTO(user)),
    }
  }

  async updateUser(id: string, updateData: { email?: string; fullName?: string | null }): Promise<User> {
    const userId = UserId.fromString(id)
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new UserNotFoundError(id)
    }

    // Update email if provided
    if (updateData.email !== undefined) {
      const newEmail = Email.create(updateData.email)
      const existingUser = await this.userRepository.findByEmail(newEmail)
      if (existingUser && !existingUser.id.equals(userId)) {
        throw new UserAlreadyExistsError(updateData.email)
      }
      user.updateEmail(updateData.email)
    }

    // Update full name if provided
    if (updateData.fullName !== undefined) {
      user.updateFullName(updateData.fullName)
    }

    await this.userRepository.save(user)
    return user
  }

  async updateUserDTO(id: string, updateData: { email?: string; fullName?: string | null }): Promise<UserDTO> {
    const user = await this.updateUser(id, updateData)
    return User.toDTO(user)
  }

  async updatePassword(id: string, newPassword: string): Promise<User> {
    const userId = UserId.fromString(id)
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new UserNotFoundError(id)
    }

    const passwordHash = await this.passwords.hash(newPassword)
    user.updatePassword(passwordHash)
    await this.userRepository.save(user)
    return user
  }

  async updatePasswordDTO(id: string, newPassword: string): Promise<UserDTO> {
    const user = await this.updatePassword(id, newPassword)
    return User.toDTO(user)
  }

  async verifyEmail(id: string): Promise<User> {
    const userId = UserId.fromString(id)
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new UserNotFoundError(id)
    }

    user.verifyEmail()
    await this.userRepository.save(user)
    return user
  }

  async verifyEmailDTO(id: string): Promise<UserDTO> {
    const user = await this.verifyEmail(id)
    return User.toDTO(user)
  }

  async deactivateUser(id: string): Promise<User> {
    const userId = UserId.fromString(id)
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new UserNotFoundError(id)
    }

    user.deactivate()
    await this.userRepository.save(user)
    return user
  }

  async deactivateUserDTO(id: string): Promise<UserDTO> {
    const user = await this.deactivateUser(id)
    return User.toDTO(user)
  }

  async activateUser(id: string): Promise<User> {
    const userId = UserId.fromString(id)
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new UserNotFoundError(id)
    }

    user.activate()
    await this.userRepository.save(user)
    return user
  }

  async activateUserDTO(id: string): Promise<UserDTO> {
    const user = await this.activateUser(id)
    return User.toDTO(user)
  }

  async deleteUser(id: string): Promise<void> {
    const userId = UserId.fromString(id)
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new UserNotFoundError(id)
    }

    await this.userRepository.delete(userId)
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const emailVo = Email.create(email)
    const user = await this.userRepository.findByEmail(emailVo)

    if (!user) {
      return null
    }

    const isValid = await this.passwords.verify(password, user.passwordHash)
    if (!isValid) {
      return null
    }

    return user
  }

  async getUserCount(): Promise<number> {
    return await this.userRepository.count()
  }
}
