import bcrypt from 'bcryptjs';
import { IPasswordHasher } from '../../modules/identity-workspace/application/ports/password-hasher';
import { InvalidPasswordError } from '../../modules/identity-workspace/domain/errors/identity.errors';

export class BcryptPasswordHasher implements IPasswordHasher {
  constructor(private readonly rounds: number) {
    if (!Number.isInteger(rounds) || rounds < 4 || rounds > 15) throw new Error('BCRYPT_ROUNDS must be an integer between 4 and 15');
  }
  hash(password: string): Promise<string> {
    if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) throw new InvalidPasswordError();
    return bcrypt.hash(password, this.rounds);
  }
  verify(password: string, hash: string): Promise<boolean> {
    if (Buffer.byteLength(password, 'utf8') > 72) return Promise.resolve(false);
    return bcrypt.compare(password, hash);
  }
}
