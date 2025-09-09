import { getAnonIdFromCookies, ensureUser } from './current-user';
import { prisma } from './prisma';

export async function requireUser() {
  const anonId = await getAnonIdFromCookies();
  const user = await ensureUser(prisma, anonId);
  return user;
}
