import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/user';
import { encrypt } from '@/lib/crypto';

function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

export async function POST() {
  const user = await requireUser();
  // idempotent: ensure a Demo Bank connection exists
  const existing = await prisma.connection.findFirst({ where: { userId: user.id, institution: 'Demo Bank' } });
  if (existing) return NextResponse.json({ ok: true, already: true });

  const conn = await prisma.connection.create({
    data: { userId: user.id, itemId: `demo-${user.id}`, institution: 'Demo Bank', accessTokenEnc: encrypt('demo'), scopes: ['balances','transactions'], status: 'active' }
  });
  const acc = await prisma.account.create({
    data: { connectionId: conn.id, accountId: `demo-${user.id}-checking`, name: 'Checking', type: 'depository', subtype: 'checking', current: '3500', available: '3400', isoCurrency: 'USD' }
  });
  const today = new Date();
  const start = addDays(today, -45);
  for (let d = new Date(start), i = 0; d <= today; d = addDays(d, 1), i++) {
    if (Math.random() < 0.5) {
      const amt = (5 + Math.random() * 60).toFixed(2);
      await prisma.transaction.create({ data: { accountId: acc.id, plaidTxnId: `demo-${user.id}-${i}`, name: 'Merchant', merchant: 'CafeX', amount: amt, isoCurrency: 'USD', datePosted: d, pending: false, hashDedupe: `${amt}|CafeX|${d.toISOString().slice(0,10)}` } });
    }
  }
  return NextResponse.json({ ok: true });
}

