import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const urlSecret = req.nextUrl.searchParams.get('secret');
  const expected = process.env.PLAID_WEBHOOK_SECRET;
  if (!expected || urlSecret !== expected) {
    return new NextResponse('unauthorized', { status: 401 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new NextResponse('bad request', { status: 400 });
  }

  // Transactions-related events
  const type = payload?.webhook_type || payload?.type || 'unknown';
  const code = payload?.webhook_code || payload?.code || 'unknown';
  const itemId = payload?.item_id || payload?.item?.item_id || null;
  const evtId = payload?.event_id || null;

  const relevant = type?.toLowerCase() === 'transactions' || ['SYNC_UPDATES_AVAILABLE','DEFAULT_UPDATE','HISTORICAL_UPDATE'].includes(String(code));
  if (!relevant || !itemId) return new NextResponse(null, { status: 204 });

  const conn = await prisma.connection.findFirst({ where: { itemId }, select: { id: true, userId: true } });
  if (!conn) return new NextResponse(null, { status: 204 });

  const key = evtId || `${itemId}:${code}:${payload?.timestamp || Date.now()}`;
  const dupe = await prisma.auditLog.findFirst({ where: { userId: conn.userId, action: 'WEBHOOK', target: key } });
  if (dupe) return new NextResponse(null, { status: 204 });

  await prisma.auditLog.create({ data: { userId: conn.userId, action: 'WEBHOOK', target: key, meta: { type, code, itemId } } });

  // Trigger refresh non-blocking
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || '';
    // Fire-and-forget; ignore response
    fetch(`${base}/jobs/refresh?userId=${encodeURIComponent(conn.userId)}`, {
      method: 'GET',
      headers: { 'x-internal-key': expected },
    }).catch(() => {});
  } catch {}

  return NextResponse.json({ ok: true });
}
