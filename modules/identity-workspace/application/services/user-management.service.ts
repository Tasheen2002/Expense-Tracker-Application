import { IUserRepository } from '../../domain/repositories/user.repository'
import { User, CreateUserData } from '../../domain/entities/user.entity'
import { UserId } from '../../domain/value-objects/user-id.vo'
import { Email } from '../../domain/value-objects/email.vo'
import bcrypt from 'bcrypt'
import {
  UserNotFoundError,
  UserAlreadyExistsError,
} from '../../domain/errors/identity.errors'

export interface UserManagementServiceOptions {
  page?: number
  limit?: number
  isActive?: boolean
  emailVerified?: boolean
  sortBy?: 'email' | 'fullName' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export class UserManagementService {
  constructor(private readonly userRepository: IUserRepository) {}

  async createUser(data: CreateUserData): Promise<User> {
    // Check if email already exists
    const email = Email.create(data.email)
    const existingUser = await this.userRepository.findByEmail(email)
    if (existingUser) {
      throw new UserAlreadyExistsError(data.email)
    }

    // Create user
    const user = User.create(data)
    await this.userRepository.save(user)
    return user
  }

  async getUserById(id: string): Promise<User | null> {
    const userId = UserId.fromString(id)
    return await this.userRepository.findById(userId)
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const emailVo = Email.create(email)
    return await this.userRepository.findByEmail(emailVo)
  }

  async getUsers(options: UserManagementServiceOptions = {}): Promise<User[]> {
    const { page = 1, limit = 50, isActive, emailVerified, sortBy = 'createdAt', sortOrder = 'desc' } = options

    const repositoryOptions = {
      limit,
      offset: (page - 1) * limit,
      isActive,
      emailVerified,
      sortBy,
      sortOrder,
    }

    return await this.userRepository.findAll(repositoryOptions)
  }

  async updateUser(id: string, updateData: Partial<CreateUserData>): Promise<User | null> {
    const userId = UserId.fromString(id)
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new UserNotFoundError(id)
    }

    // Update email if provided
    if (updateData.email !== undefined) {
      const newEmail = Email.create(updateData.email)
      const existingUser = await this.userRepository.findByEmail(newEmail)
      if (existingUser && !existingUser.getId().equals(userId)) {
        throw new UserAlreadyExistsError(updateData.email)
      }
      user.updateEmail(updateData.email)
    }

    // Update full name if provided
    if (updateData.fullName !== undefined) {
      user.updateFullName(updateData.fullName)
    }

    await this.userRepository.update(user)
    return user
  }

  async updatePassword(id: string, newPassword: string): Promise<User | null> {
    const userId = UserId.fromString(id)
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new UserNotFoundError(id)
    }

    // Hash password
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '10')
    const passwordHash = await bcrypt.hash(newPassword, bcryptRounds)

    user.updatePassword(passwordHash)
    await this.userRepository.update(user)
    return user
  }

  async verifyEmail(id: string): Promise<User | null> {
    const userId = UserId.fromString(id)
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new UserNotFoundError(id)
    }

    user.verifyEmail()
    await this.userRepository.update(user)
    return user
  }

  async deactivateUser(id: string): Promise<User | null> {
    const userId = UserId.fromString(id)
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new UserNotFoundError(id)
    }

    user.deactivate()
    await this.userRepository.update(user)
    return user
  }

  async activateUser(id: string): Promise<User | null> {
    const userId = UserId.fromString(id)
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new UserNotFoundError(id)
    }

    user.activate()
    await this.userRepository.update(user)
    return user
  }

  async deleteUser(id: string): Promise<boolean> {
    const userId = UserId.fromString(id)
    const user = await this.userRepository.findById(userId)

    if (!user) {
      return false
    }

    await this.userRepository.delete(userId)
    return true
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const emailVo = Email.create(email)
    const user = await this.userRepository.findByEmail(emailVo)

    if (!user) {
      return null
    }

    const isValid = await bcrypt.compare(password, user.getPasswordHash())
    if (!isValid) {
      return null
    }

    return user
  }

  async getUserCount(): Promise<number> {
    return await this.userRepository.count()
  }
}
