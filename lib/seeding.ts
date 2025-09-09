import { prisma } from '@/lib/prisma';

function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

async function ensureRootCategory(name: string) {
  const existing = await prisma.category.findFirst({ where: { name, parentId: null } });
  if (existing) return existing;
  return prisma.category.create({ data: { name } });
}

export async function seedDemoForUser(userId: string) {
  // Connection
  let conn = await prisma.connection.findFirst({ where: { userId, institution: 'Demo Bank' } });
  if (!conn) {
    conn = await prisma.connection.create({
      data: {
        userId,
        itemId: `demo-item-${userId}`,
        institution: 'Demo Bank',
        accessTokenEnc: 'demo', // not used; keeps schema satisfied
        scopes: ['balances','transactions'],
        status: 'active'
      }
    });
  }

  // Account
  let account = await prisma.account.findFirst({ where: { connectionId: conn.id } });
  if (!account) {
    account = await prisma.account.create({ data: { connectionId: conn.id, accountId: `demo-account-${userId}`, name: 'Checking', type: 'depository', subtype: 'checking', current: '4200', available: '4100', isoCurrency: 'USD' } });
  }

  // Categories
  const dining = await ensureRootCategory('Dining');
  const groceries = await ensureRootCategory('Groceries');
  const rent = await ensureRootCategory('Rent');

  // Deterministic transactions for last 180 days
  const today = new Date();
  const start = addDays(today, -180);
  const txToCreate: any[] = [];
  let i = 0;
  for (let day = new Date(start); day <= today; day = addDays(day, 1)) {
    if (day.getDate() === 1) {
      const id = `demo-rent-${day.toISOString().slice(0,10)}-${userId}`;
      txToCreate.push({
        accountId: account.id,
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
      });
      i++;
    }
    if ([1,4].includes(day.getDay())) {
      const id = `demo-groc-${day.toISOString().slice(0,10)}-${userId}`;
      const amt = (40 + ((day.getTime()/86400000) % 30)).toFixed(2);
      txToCreate.push({
        accountId: account.id,
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
      });
      i++;
    }
    if (day.getDay() !== 0 && (day.getTime()/86400000) % 3 === 0) {
      const id = `demo-coffee-${day.toISOString().slice(0,10)}-${userId}`;
      const amt = (3 + ((day.getTime()/86400000) % 3)).toFixed(2);
      txToCreate.push({
        accountId: account.id,
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
      });
      i++;
    }
  }

  if (txToCreate.length) {
    await prisma.transaction.createMany({ data: txToCreate, skipDuplicates: true });
  }

  // Categorize deterministically (upsert by plaidTxnId)
  const rentTx = await prisma.transaction.findMany({ where: { accountId: account.id, merchant: 'Landlord LLC' }, select: { id: true } });
  const grocTx = await prisma.transaction.findMany({ where: { accountId: account.id, merchant: 'WholeFoods' }, select: { id: true } });
  const cofTx = await prisma.transaction.findMany({ where: { accountId: account.id, merchant: 'CafeX' }, select: { id: true } });

  for (const t of rentTx) {
    await prisma.txnCategory.upsert({ where: { txnId: t.id }, update: { categoryId: rent.id, confidence: 100, source: 'seed' }, create: { txnId: t.id, categoryId: rent.id, confidence: 100, source: 'seed' } });
  }
  for (const t of grocTx) {
    await prisma.txnCategory.upsert({ where: { txnId: t.id }, update: { categoryId: groceries.id, confidence: 100, source: 'seed' }, create: { txnId: t.id, categoryId: groceries.id, confidence: 100, source: 'seed' } });
  }
  for (const t of cofTx) {
    await prisma.txnCategory.upsert({ where: { txnId: t.id }, update: { categoryId: dining.id, confidence: 80, source: 'seed' }, create: { txnId: t.id, categoryId: dining.id, confidence: 80, source: 'seed' } });
  }

  const createdTxns = await prisma.transaction.count({ where: { accountId: account.id } });
  return { accounts: 1, txns: createdTxns };
}

