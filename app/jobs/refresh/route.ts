import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPlaidClient } from '@/lib/plaid';
import { decrypt } from '@/lib/crypto';
import { recomputeInsights } from '@/lib/insights';
import { requireUser } from '@/lib/user';
import { aiEnabled } from '@/lib/ai';
import { categorizeBatch } from '@/lib/ai-categorize';
import { writeInsights } from '@/lib/ai-insights';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  const start = Date.now();
  let refreshedTxns = 0;
  let refreshedAccounts = 0;
  let note: string | undefined;

  try {
    // 1) Pull connections & optionally fetch Plaid txns
    const current = await requireUser();
    const connections = await prisma.connection.findMany({ where: { userId: current.id, status: 'active', revokedAt: null } });
    const plaidConfigured = Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
    const plaid = plaidConfigured ? getPlaidClient() : null;

    if (!plaidConfigured || connections.length === 0) {
      note = 'Plaid not linked or no active connections; ran local recompute only';
    } else {
      for (const c of connections) {
        refreshedAccounts++;
        if (!c.accessTokenEnc || !plaid) continue;
        const accessToken = decrypt(c.accessTokenEnc);
        if (!accessToken || accessToken === 'demo') continue;

        // Simple transactions pull (demo-friendly)
        const today = new Date();
        const since = new Date(); since.setDate(today.getDate() - 30);
        const resp = await plaid.transactionsGet({
          access_token: accessToken,
          start_date: since.toISOString().slice(0, 10),
          end_date: today.toISOString().slice(0, 10),
        });

        const acctIdByPlaidId = new Map(
          (await prisma.account.findMany({ where: { connectionId: c.id }, select: { id: true, accountId: true } }))
          .map(a => [a.accountId, a.id])
        );

        for (const t of resp.data.transactions) {
          const acctId = acctIdByPlaidId.get(t.account_id);
          if (!acctId) continue;
          const amt = Math.abs(Number(t.amount || 0));
          const nm = t.name || 'Transaction';
          const hd = `${amt}|${nm}|${t.date}`;
          await prisma.transaction.upsert({
            where: { plaidTxnId: t.transaction_id },
            update: {
              amount: amt,
              datePosted: new Date(t.date),
              name: nm,
              merchant: t.merchant_name || null,
              hashDedupe: hd,
            },
            create: {
              plaidTxnId: t.transaction_id,
              accountId: acctId,
              amount: amt,
              datePosted: new Date(t.date),
              name: nm,
              merchant: t.merchant_name || null,
              hashDedupe: hd,
            },
          });
          refreshedTxns++;
        }
      }
    }

    // 2) Recompute KPIs locally over the last 30 days
    const insights = await recomputeInsights(current.id);

    // 3) Optional AI auto-categorization (limit batch for cost control)
    let autoCat = { applied: 0, suggestedRules: 0 };
    if (aiEnabled(process.env.AI_AUTOCAT_ENABLED)) {
      const uncategorized = await prisma.transaction.findMany({
        where: { categories: { none: {} } },
        select: { id: true, merchant: true, name: true, amount: true },
        take: 50,
      });
      autoCat = await categorizeBatch(
        uncategorized.map(t => ({ id: t.id, merchant: t.merchant ?? undefined, name: t.name, amount: Number(t.amount) }))
      );
    }

    // 4) Optional AI tips from the KPI snapshot
    let aiTips = { created: 0 };
    // Run insights unless explicitly disabled; writeInsights will fall back
    // to heuristic tips when OPENAI_API_KEY is not set.
    if (process.env.AI_INSIGHTS_ENABLED !== 'false') {
      aiTips = await writeInsights(current.id, insights);
    }

    // 5) Audit log
    await prisma.auditLog.create({
      data: {
        userId: current.id,
        action: 'JOB_REFRESH',
        target: 'all',
        meta: { refreshedTxns, refreshedAccounts, tookMs: Date.now() - start, note, autoCat, aiTips },
      },
    });

    // 6) Respond
    return NextResponse.json({
      ok: true,
      refreshed: { txns: refreshedTxns, accounts: refreshedAccounts, insights },
      note,
      ai: { autoCategorized: autoCat.applied, rulesSuggested: autoCat.suggestedRules, tipsCreated: aiTips.created },
    });
  } catch (err: any) {
    console.error('refresh error', err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
