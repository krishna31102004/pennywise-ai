import { prisma } from '@/lib/prisma';
import BalanceTrendClient from './BalanceTrendClient';

export default async function BalanceTrend() {
  const since = new Date(); since.setDate(since.getDate() - 30);
  // Simplified “trend”: sum of available across accounts per render
  const accounts = await prisma.account.findMany({ select: { available: true } });
  const total = accounts.reduce((s, a) => s + Number(a.available ?? 0), 0);
  const points = Array.from({ length: 30 }).map((_, i) => ({
    day: i + 1,
    value: Math.max(0, total - i * (total * 0.002)) // fake slope for demo view
  }));
  return <BalanceTrendClient points={points} />;
}
