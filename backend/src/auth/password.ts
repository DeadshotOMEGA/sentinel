import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length === 0) {
    throw new Error('Password cannot be empty');
  }

  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || password.length === 0) {
    throw new Error('Password cannot be empty');
  }

  if (!hash || hash.length === 0) {
    throw new Error('Password hash cannot be empty');
  }

  return await bcrypt.compare(password, hash);
}
