import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/user';

export async function GET() {
  const user = await requireUser();
  const active = await prisma.connection.count({ where: { userId: user.id, status: 'active' } });
  const disconnected = await prisma.connection.count({ where: { userId: user.id, NOT: { status: 'active' } } });
  return NextResponse.json({ active, disconnected });
}

