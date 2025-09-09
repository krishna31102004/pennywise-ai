import { prisma } from '../lib/prisma';

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

async function ensureCategory(name: string) {
  const found = await prisma.category.findFirst({ where: { name, parentId: null } });
  return found ?? prisma.category.create({ data: { name } });
}

async function main() {
  const since = new Date(); since.setDate(since.getDate() - 90);

  const cats = new Map<string, string>();
  for (const name of ['Dining','Groceries','Transport','Rent','Entertainment','Uncategorized']) {
    const c = await ensureCategory(name);
    cats.set(name, c.id);
  }

  const txns = await prisma.transaction.findMany({
    where: { datePosted: { gte: since } },
    select: { id: true, merchant: true, name: true, categories: { select: { id: true } } },
  });

  let applied = 0;
  for (const t of txns) {
    if (t.categories.length > 0) continue;
    const tag = classifyFallback(t.merchant, t.name);
    const categoryId = cats.get(tag)!;
    await prisma.txnCategory.create({ data: { txnId: t.id, categoryId, confidence: 70, source: 'demo-rules' } });
    applied++;
  }

  console.log(`Applied categories to ${applied} transactions.`);
}

main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});

