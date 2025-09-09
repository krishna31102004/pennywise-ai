import { prisma } from './prisma';
import { subDays, startOfMonth, endOfMonth } from 'date-fns';

export async function recomputeInsights(userId: string) {
  const since30 = subDays(new Date(), 30);
  const txns = await prisma.transaction.findMany({
    where: { account: { connection: { userId, status: 'active', revokedAt: null } }, datePosted: { gte: since30 } },
    select: { amount: true, datePosted: true, pending: true },
  });
  const spend = txns.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
  const avgDailyBurn = spend / 30;
  const accounts = await prisma.account.findMany({ where: { connection: { userId, status: 'active', revokedAt: null } }, select: { available: true } });
  const available = accounts.reduce((s, a) => s + Number(a.available ?? 0), 0);
  const runwayDays = avgDailyBurn > 0 ? Math.round(available / avgDailyBurn) : 9999;
  const safeToSpend = Math.max(0, available - avgDailyBurn * 7);
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthSpend = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: {
      account: { connection: { userId, status: 'active', revokedAt: null } },
      datePosted: { gte: monthStart, lte: monthEnd },
      amount: { gt: 0 },
    },
  });
  await prisma.insight.create({
    data: {
      userId,
      type: 'kpi',
      period: '30d',
      payload: { avgDailyBurn, available, runwayDays, safeToSpend, monthSpend: Number(monthSpend._sum.amount ?? 0) },
    },
  });
  // Soft retention: keep last 60 KPI rows for 30d period
  const extra = await prisma.insight.findMany({
    where: { userId, type: 'kpi', period: '30d' },
    orderBy: { createdAt: 'desc' },
    skip: 60,
    select: { id: true },
  });
  if (extra.length) {
    await prisma.insight.deleteMany({ where: { id: { in: extra.map(x => x.id) } } });
  }
  return { avgDailyBurn, available, runwayDays, safeToSpend };
}
