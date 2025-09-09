import React from 'react';
import PlaidLinkButton from '@/components/PlaidLinkButton';
import Sidebar from '@/components/Sidebar';
import RefreshButton from '@/components/RefreshButton';
import Badge from '@/components/ui/Badge';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/user';

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const lastRun = await prisma.auditLog.findFirst({ where: { userId: user.id, action: 'JOB_REFRESH' }, orderBy: { createdAt: 'desc' } });
  const mins = lastRun ? Math.max(0, Math.floor((Date.now() - new Date(lastRun.createdAt).getTime())/60000)) : null;
  const env = (process.env.PLAID_ENV || 'sandbox').toLowerCase();
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[240px_1fr] relative z-10">
      <Sidebar />
      <main className="p-6">
        <div className="container">
          <Header env={env} lastMins={mins} />
          {children}
        </div>
      </main>
    </div>
  );
}

function Header({ env, lastMins }: { env: string; lastMins: number | null }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-xl font-semibold">Pennywise AI</h1>
      <div className="flex gap-3 items-center">
        <Badge tone="info">Env: {env}</Badge>
        <span className="text-xs text-subtext">{lastMins === null ? 'Last updated: —' : `Last updated ${lastMins} min ago`}</span>
        <RefreshButton />
        <PlaidLinkButton />
      </div>
    </div>
  );
}
