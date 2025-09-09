import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/user';
import { seedDemoForUser } from '@/lib/seeding';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    if (req.method !== 'POST') return new NextResponse('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
    const user = await requireUser();
    const existing = await seedDemoForUser(user.id);
    try {
      revalidatePath('/dashboard');
      revalidatePath('/transactions');
      revalidatePath('/accounts');
      revalidatePath('/insights');
    } catch {}
    // Structured log
    console.log(JSON.stringify({ action: 'SEED_DEMO', userId: user.id, createdTxns: existing.txns, createdAccounts: existing.accounts }));
    return NextResponse.json({ ok: true, seeded: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function GET() {
  return new NextResponse('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
}
