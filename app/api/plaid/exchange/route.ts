import { NextRequest, NextResponse } from 'next/server';
import { getPlaidClient } from '@/lib/plaid';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';
import { requireUser } from '@/lib/user';

export async function POST(req: NextRequest) {
  const { public_token, institution } = await req.json();
  const plaid = getPlaidClient();
  const tok = await plaid.itemPublicTokenExchange({ public_token });
  const accessToken = tok.data.access_token;
  const itemId = tok.data.item_id;
  const user = await requireUser();

  await prisma.$transaction(async (trx) => {
    const connection = await trx.connection.upsert({
      where: { itemId },
      update: { institution, accessTokenEnc: encrypt(accessToken), status: 'active' },
      create: {
        userId: user.id,
        institution: institution || 'Unknown',
        itemId,
        accessTokenEnc: encrypt(accessToken),
        scopes: ['balances', 'transactions'],
        status: 'active',
      },
    });
    const accs = await plaid.accountsGet({ access_token: accessToken });
    for (const a of accs.data.accounts) {
      await trx.account.upsert({
        where: { accountId: a.account_id },
        update: {
          name: a.name || a.official_name || 'Account',
          officialName: a.official_name || null,
          mask: a.mask || null,
          type: a.type || 'unknown',
          subtype: a.subtype || null,
          current: a.balances.current ? a.balances.current.toString() : null,
          available: a.balances.available ? a.balances.available.toString() : null,
          isoCurrency: a.balances.iso_currency_code || null,
        },
        create: {
          connectionId: connection.id,
          accountId: a.account_id,
          name: a.name || a.official_name || 'Account',
          officialName: a.official_name || null,
          mask: a.mask || null,
          type: a.type || 'unknown',
          subtype: a.subtype || null,
          current: a.balances.current ? a.balances.current.toString() : null,
          available: a.balances.available ? a.balances.available.toString() : null,
          isoCurrency: a.balances.iso_currency_code || null,
        },
      });
    }
  });

  return NextResponse.json({ ok: true, item_id: itemId });
}
