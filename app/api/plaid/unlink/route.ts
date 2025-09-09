import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPlaidClient } from '@/lib/plaid';
import { decrypt } from '@/lib/crypto';
import { requireUser } from '@/lib/user';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));
  const connectionId: string | undefined = body?.connectionId;
  const hardDelete: boolean = Boolean(body?.hardDelete || body?.hard);
  if (!connectionId) return NextResponse.json({ ok: false, error: 'missing_connectionId' }, { status: 400 });

  const conn = await prisma.connection.findFirst({ where: { id: connectionId, userId: user.id } });
  if (!conn) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

  // Try to revoke at Plaid if this was active
  try {
    if (conn.status === 'active' && conn.accessTokenEnc) {
      const plaid = getPlaidClient();
      const access_token = decrypt(conn.accessTokenEnc);
      await plaid.itemRemove({ access_token });
    }
  } catch (e) {
    // ignore network/PLAID errors but continue unlink locally
  }

  let removedAccounts = 0;
  let removedTxns = 0;

  if (hardDelete) {
    await prisma.$transaction(async (trx) => {
      const accounts = await trx.account.findMany({ where: { connectionId: conn.id }, select: { id: true } });
      const accountIds = accounts.map((a) => a.id);
      removedAccounts = accountIds.length;
      if (accountIds.length) {
        const txns = await trx.transaction.findMany({ where: { accountId: { in: accountIds } }, select: { id: true } });
        const txnIds = txns.map((t) => t.id);
        removedTxns = txnIds.length;
        if (txnIds.length) {
          await trx.txnCategory.deleteMany({ where: { txnId: { in: txnIds } } });
          await trx.transaction.deleteMany({ where: { id: { in: txnIds } } });
        }
        await trx.account.deleteMany({ where: { id: { in: accountIds } } });
      }
      await trx.connection.delete({ where: { id: conn.id } });
      await trx.auditLog.create({ data: { userId: user.id, action: 'LINK_REMOVE', target: conn.id, meta: { mode: 'hard', removedAccounts, removedTxns } } });
    });
  } else {
    await prisma.connection.update({ where: { id: conn.id }, data: { status: 'revoked', revokedAt: new Date() } });
    await prisma.auditLog.create({ data: { userId: user.id, action: 'LINK_REMOVE', target: conn.id, meta: { mode: 'soft' } } });
  }

  // Recompute/refresh pages
  try {
    revalidatePath('/dashboard');
    revalidatePath('/transactions');
    revalidatePath('/accounts');
    revalidatePath('/insights');
  } catch {}

  return NextResponse.json({ ok: true, mode: hardDelete ? 'hard' : 'soft', removed: { accounts: removedAccounts, txns: removedTxns } });
}
