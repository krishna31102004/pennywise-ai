import { cookies } from 'next/headers';
import type { PrismaClient } from '@prisma/client';
import { prisma } from './prisma';

export async function getAnonIdFromCookies(): Promise<string> {
  // Read cookie set by middleware; if missing (edge), generate but don't write here.
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const c = await (cookies() as any);
  const val = c?.get?.('pw_anid')?.value as string | undefined;
  return val ?? (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2));
}

export async function ensureUser(client: PrismaClient, anonId: string) {
  const found = await client.user.findUnique({ where: { anonId } });
  if (found) return found;
  try {
    const created = await client.user.create({ data: { anonId } });
    try { await client.auditLog.create({ data: { userId: created.id, action: 'USER_CREATE', target: 'self' } }); } catch {}
    return created;
  } catch (e: any) {
    if (e?.code === 'P2002') {
      const retry = await client.user.findUnique({ where: { anonId } });
      if (retry) return retry;
    }
    throw e;
  }
}

export async function getCurrentUserId(): Promise<string> {
  const anonId = await getAnonIdFromCookies();
  const user = await ensureUser(prisma, anonId);
  return user.id;
}

export async function getCurrentUser() {
  const id = await getCurrentUserId();
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('User not found after ensureUser');
  return user;
}

