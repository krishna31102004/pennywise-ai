import { NextResponse } from 'next/server';
import { getPlaidClient } from '@/lib/plaid';
import { requireUser } from '@/lib/user';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

export async function POST(req: Request) {
  const plaid = getPlaidClient();
  const user = await requireUser();
  const url = new URL(req.url);
  const mode = url.searchParams.get('mode');
  const connectionId = url.searchParams.get('connectionId');

  if (mode === 'update' && connectionId) {
    const conn = await prisma.connection.findFirst({ where: { id: connectionId, userId: user.id } });
    if (!conn) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const access_token = decrypt(conn.accessTokenEnc);
    const resp = await plaid.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: process.env.NEXT_PUBLIC_APP_NAME || 'Pennywise AI',
      language: 'en',
      country_codes: (process.env.PLAID_COUNTRY_CODES || 'US').split(',') as any,
      webhook: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/plaid/webhook`,
      access_token,
    } as any);
    return NextResponse.json({ link_token: resp.data.link_token });
  }

  const resp = await plaid.linkTokenCreate({
    user: { client_user_id: user.id },
    client_name: process.env.NEXT_PUBLIC_APP_NAME || 'Pennywise AI',
    language: 'en',
    country_codes: (process.env.PLAID_COUNTRY_CODES || 'US').split(',') as any,
    products: (process.env.PLAID_PRODUCTS || 'transactions,balances').split(',') as any,
    webhook: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/plaid/webhook`,
  });
  return NextResponse.json({ link_token: resp.data.link_token });
}
