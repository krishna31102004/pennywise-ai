import { prisma } from '@/lib/prisma';
import CategorySpendClient from './CategorySpendClient';

function classifyFallback(merchant?: string | null, name?: string | null) {
  const s = `${merchant ?? ''} ${name ?? ''}`.toLowerCase();

  const any = (arr: string[]) => arr.some(w => s.includes(w));
  if (any(['cafe', 'coffee', 'starbucks', 'restaurant', 'grill', 'burger', 'pizza', 'chipotle', 'mcdonald', 'kfc', 'taco'])) return 'Dining';
  if (any(['grocery', 'market', 'whole foods', 'trader joe', 'walmart', 'safeway', 'costco', 'kroger', 'aldi'])) return 'Groceries';
  if (any(['uber', 'lyft', 'shell', 'chevron', 'exxon', 'bp', 'gas', 'fuel'])) return 'Transport';
  if (any(['rent', 'landlord', 'apartment'])) return 'Rent';
  if (any(['netflix', 'spotify', 'hulu', 'steam', 'playstation', 'xbox'])) return 'Entertainment';
  return 'Uncategorized';
}

export default async function CategorySpend() {
  const monthStart = new Date(); monthStart.setDate(1);

  const txns = await prisma.transaction.findMany({
    where: { datePosted: { gte: monthStart }, amount: { gt: 0 } }, // spend only
    select: {
      amount: true, merchant: true, name: true,
      categories: { select: { category: { select: { name: true } } } },
    },
  });

  const byCat = new Map<string, number>();
  for (const t of txns) {
    const cat = t.categories[0]?.category?.name || classifyFallback(t.merchant, t.name);
    byCat.set(cat, (byCat.get(cat) ?? 0) + Number(t.amount));
  }

  const rows = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([name, value]) => ({ name, value }));

  return <CategorySpendClient data={rows} />;
}
