import { randomUUID } from 'crypto';
import { redis } from '../db/redis';
import type { AdminUser, AdminRole } from '../../../shared/types/index';

export interface Session {
  userId: string;
  username: string;
  role: AdminRole;
  createdAt: number;
  expiresAt: number;
}

const SESSION_TTL_SECONDS = 28800; // 8 hours

function getSessionKey(token: string): string {
  return `session:${token}`;
}

export async function createSession(user: AdminUser): Promise<string> {
  const token = randomUUID();
  const now = Date.now();

  const session: Session = {
    userId: user.id,
    username: user.username,
    role: user.role,
    createdAt: now,
    expiresAt: now + (SESSION_TTL_SECONDS * 1000),
  };

  const key = getSessionKey(token);
  await redis.setex(key, SESSION_TTL_SECONDS, JSON.stringify(session));

  return token;
}

export async function getSession(token: string): Promise<Session | null> {
  if (!token || token.length === 0) {
    return null;
  }

  const key = getSessionKey(token);
  const sessionData = await redis.get(key);

  if (!sessionData) {
    return null;
  }

  try {
    const session = JSON.parse(sessionData) as Session;

    // Check if session has expired
    if (session.expiresAt < Date.now()) {
      await redis.del(key);
      return null;
    }

    return session;
  } catch (error) {
    // Invalid session data format
    await redis.del(key);
    return null;
  }
}

export async function destroySession(token: string): Promise<void> {
  if (!token || token.length === 0) {
    throw new Error('Session token cannot be empty');
  }

  const key = getSessionKey(token);
  await redis.del(key);
}

export async function refreshSession(token: string): Promise<boolean> {
  if (!token || token.length === 0) {
    return false;
  }

  const session = await getSession(token);

  if (!session) {
    return false;
  }

  const key = getSessionKey(token);
  const now = Date.now();

  session.expiresAt = now + (SESSION_TTL_SECONDS * 1000);

  await redis.setex(key, SESSION_TTL_SECONDS, JSON.stringify(session));

  return true;
}
