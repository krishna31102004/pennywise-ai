import { NextResponse, NextRequest } from 'next/server';

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return (crypto as any).randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const cookie = req.cookies.get('pw_anid');
  if (!cookie) {
    const id = randomId();
    res.cookies.set('pw_anid', id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/plaid/webhook).*)'],
};
