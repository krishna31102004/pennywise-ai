// lib/ai-tools.ts
import { prisma } from './prisma';
import { requireUser } from './user';
import type { Prisma } from '@prisma/client';

export async function getSpendByCategory(args: { category: string; from?: string; to?: string }) {
  const user = await requireUser();
  const from = args.from ? new Date(args.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = args.to ? new Date(args.to) : new Date();
  const txns = await prisma.transaction.findMany({
    where: {
      datePosted: { gte: from, lte: to },
      amount: { gt: 0 },
      account: { connection: { userId: user.id, status: 'active', revokedAt: null } },
      categories: { some: { category: { name: { equals: args.category, mode: 'insensitive' as Prisma.QueryMode } } } },
    },
    select: { amount: true, datePosted: true }
  });
  const total = txns.reduce((s, t) => s + Number(t.amount), 0);
  return { total, count: txns.length, from, to };
}

export async function getMerchantSpend(args: { merchant: string; from?: string; to?: string }) {
  const user = await requireUser();
  const from = args.from ? new Date(args.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = args.to ? new Date(args.to) : new Date();
  const txns = await prisma.transaction.findMany({
    where: {
      datePosted: { gte: from, lte: to },
      amount: { gt: 0 },
      account: { connection: { userId: user.id, status: 'active', revokedAt: null } },
      OR: [
        { merchant: { contains: args.merchant, mode: 'insensitive' as Prisma.QueryMode } },
        { name: { contains: args.merchant, mode: 'insensitive' as Prisma.QueryMode } },
      ],
    },
    select: { amount: true, datePosted: true, name: true, merchant: true }
  });
  const total = txns.reduce((s, t) => s + Number(t.amount), 0);
  return { total, count: txns.length, from, to, sample: txns.slice(0, 5) };
}

export async function getRecurring(args: { merchant?: string }) {
  const user = await requireUser();
  const where: Prisma.RecurringSeriesWhereInput | undefined = args.merchant
    ? { merchant: { contains: args.merchant, mode: 'insensitive' as Prisma.QueryMode }, userId: user.id }
    : { userId: user.id };
  const rec = await prisma.recurringSeries.findMany({
    where, orderBy: { lastSeen: 'desc' }, take: 10
  });
  return { recurring: rec };
}

export const TOOL_REGISTRY = {
  getSpendByCategory,
  getMerchantSpend,
  getRecurring,
};

export type ToolName = keyof typeof TOOL_REGISTRY;
