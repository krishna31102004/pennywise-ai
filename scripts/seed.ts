import { prisma } from '../lib/prisma';
import { encrypt } from '../lib/crypto';

function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

async function ensureRootCategory(name: string) {
  const existing = await prisma.category.findFirst({ where: { name, parentId: null } });
  if (existing) return existing;
  return prisma.category.create({ data: { name } });
}

async function main() {
  const anon = await prisma.user.upsert({
    where: { anonId: 'demo' },
    update: {},
    create: { anonId: 'demo' },
  });
  const conn = await prisma.connection.upsert({
    where: { itemId: 'demo-item' },
    update: {},
    create: {
      userId: anon.id,
      itemId: 'demo-item',
      institution: 'Demo Bank',
      accessTokenEnc: encrypt('demo'),
      scopes: ['balances', 'transactions'],
      status: 'active',
    },
  });
  const acc = await prisma.account.upsert({
    where: { accountId: 'demo-account' },
    update: {},
    create: {
      connectionId: conn.id,
      accountId: 'demo-account',
      name: 'Checking',
      type: 'depository',
      subtype: 'checking',
      current: '3200.00',
      available: '3100.00',
      isoCurrency: 'USD',
    },
  });
  const dining = await ensureRootCategory('Dining');
  const groceries = await ensureRootCategory('Groceries');
  const rent = await ensureRootCategory('Rent');
  const today = new Date();
  const start = addDays(today, -180);
  let day = new Date(start);
  let i = 0;
  while (day <= today) {
    if (day.getDate() === 1) {
      const id = `demo-rent-${day.toISOString().slice(0, 10)}`;
      await prisma.transaction.upsert({
        where: { plaidTxnId: id },
        update: {},
        create: {
          accountId: acc.id,
          plaidTxnId: id,
          name: 'Rent payment',
          merchant: 'Landlord LLC',
          amount: '1200',
          isoCurrency: 'USD',
          datePosted: day,
          pending: false,
          originalDesc: null,
          mcc: null,
          hashDedupe: `h-rent-${i}`,
        },
      });
      const t = await prisma.transaction.findUnique({ where: { plaidTxnId: id } });
      if (t) {
        await prisma.txnCategory.upsert({
          where: { txnId: t.id },
          update: { categoryId: rent.id, confidence: 100, source: 'seed' },
          create: { txnId: t.id, categoryId: rent.id, confidence: 100, source: 'seed' },
        });
      }
    }
    if (day.getDay() in { 1: 1, 4: 1 }) {
      const id = `demo-groc-${i}`;
      const amt = (40 + Math.random() * 30).toFixed(2);
      await prisma.transaction.upsert({
        where: { plaidTxnId: id },
        update: {},
        create: {
          accountId: acc.id,
          plaidTxnId: id,
          name: 'Grocery Store',
          merchant: 'WholeFoods',
          amount: amt,
          isoCurrency: 'USD',
          datePosted: day,
          pending: false,
          originalDesc: null,
          mcc: null,
          hashDedupe: `h-groc-${i}`,
        },
      });
      const t = await prisma.transaction.findUnique({ where: { plaidTxnId: id } });
      if (t) {
        await prisma.txnCategory.upsert({
          where: { txnId: t.id },
          update: { categoryId: groceries.id, confidence: 100, source: 'seed' },
          create: { txnId: t.id, categoryId: groceries.id, confidence: 100, source: 'seed' },
        });
      }
      i++;
    }
    if (Math.random() < 0.4) {
      const id = `demo-cof-${i}`;
      const amt = (3 + Math.random() * 3).toFixed(2);
      await prisma.transaction.upsert({
        where: { plaidTxnId: id },
        update: {},
        create: {
          accountId: acc.id,
          plaidTxnId: id,
          name: 'Coffee Shop',
          merchant: 'CafeX',
          amount: amt,
          isoCurrency: 'USD',
          datePosted: day,
          pending: false,
          originalDesc: null,
          mcc: null,
          hashDedupe: `h-cof-${i}`,
        },
      });
      i++;
    }
    day = addDays(day, 1);
  }
  const txCount = await prisma.transaction.count({ where: { account: { connectionId: conn.id } } });
  const accCount = await prisma.account.count({ where: { connectionId: conn.id } });
  await prisma.insight.create({
    data: { userId: anon.id, type: 'seed-summary', period: 'all', payload: { txCount, accCount } },
  });
  console.log('Seed complete: 6 months of sample data.');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });