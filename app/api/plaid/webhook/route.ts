import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  // Stub: Accept all webhooks in dev; implement signature check if needed
  return NextResponse.json({ ok: true });
}