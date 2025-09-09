// lib/ai-categorize.ts
import { jsonResponse } from './ai';
import { prisma } from './prisma';

type Txn = { id: string; merchant?: string | null; name: string; amount: number };

const CAT = ['Dining','Groceries','Transport','Rent','Entertainment','Uncategorized'] as const;
type CatName = typeof CAT[number];

function sanitizeBatch(txns: Txn[]) {
  return txns.map(t => ({
    txnId: t.id,
    merchant: (t.merchant || '').slice(0, 64),
    name: t.name.slice(0, 96),
    amount: Number(t.amount.toFixed(2))
  }));
}

async function ensureRoots() {
  const cache = new Map<CatName,string>();
  for (const name of CAT) {
    const found = await prisma.category.findFirst({ where: { name, parentId: null } })
      || await prisma.category.create({ data: { name } });
    cache.set(name, found.id);
  }
  return cache;
}

export async function categorizeBatch(txns: Txn[]) {
  if (!txns.length) return { applied: 0, suggestedRules: 0 };
  const safe = sanitizeBatch(txns).slice(0, 100);

  const sys = 'You are a finance classifier. Choose the single best category per txn. Suggest simple rules if obvious.';
  const usr = `Categories: ${CAT.join(', ')}. Return JSON array of objects: 
[{ "txnId": "...", "category": "Dining|Groceries|Transport|Rent|Entertainment|Uncategorized", "confidence": 0-100, "suggestRule": "contains(\\"starbucks\\")" | null }]
Txns: ${JSON.stringify(safe)}`;

  const out = await jsonResponse(sys, usr);
  if (!Array.isArray(out)) return { applied: 0, suggestedRules: 0 };

  const cats = await ensureRoots();
  let applied = 0, suggestedRules = 0;

  for (const r of out) {
    const catId = cats.get((r.category as CatName) || 'Uncategorized');
    if (!catId) continue;

    await prisma.txnCategory.upsert({
      where: { txnId: r.txnId },
      update: { categoryId: catId, confidence: Number(r.confidence ?? 70), source: 'ai' },
      create: { txnId: r.txnId, categoryId: catId, confidence: Number(r.confidence ?? 70), source: 'ai' },
    });
    applied++;

    if (r.suggestRule && typeof r.suggestRule === 'string' && r.suggestRule.length < 120) {
      // naive "contains(...)" matcher text stored in Rule.matcher
      const txn = await prisma.transaction.findUnique({
        where: { id: r.txnId },
        include: { account: { include: { connection: true } } }
      });
      if (txn?.account.connection.userId) {
        await prisma.rule.create({
          data: { userId: txn.account.connection.userId, matcher: r.suggestRule, categoryId: catId }
        });
        suggestedRules++;
      }
    }
  }
  return { applied, suggestedRules };
}

