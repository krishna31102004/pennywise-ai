import { cookies } from 'next/headers';
import { prisma } from './prisma';

export async function getAnonId(): Promise<string | null> {
  try {
    // Next.js 15 may require awaiting cookies()
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const c = await (cookies() as any);
    const id = c?.get?.('pw_anid')?.value as string | null | undefined;
    return id ?? null;
  } catch { return null; }
}

export async function requireUser() {
  const anonId = await getAnonId();
  const id = anonId || 'unknown';
  const user = await prisma.user.upsert({ where: { anonId: id }, update: {}, create: { anonId: id } });
  return user;
}
