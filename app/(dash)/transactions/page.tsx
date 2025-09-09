import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/user';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import PlaidLinkButton from '@/components/PlaidLinkButton';
export const dynamic = 'force-dynamic';

export default async function TransactionsPage(props: any) {
  const user = await requireUser();
  const sp = props?.searchParams && typeof props.searchParams.then === 'function'
    ? await props.searchParams
    : (props?.searchParams ?? {});
  const q = (sp?.q ?? '').toString().trim();
  const includeDisc = String(sp?.disconnected || '') === '1';
  const filter = String(sp?.f || 'All');
  const txns = await prisma.transaction.findMany({
    where: {
      account: { connection: { userId: user.id, ...(includeDisc ? {} : { status: 'active', revokedAt: null }) } },
      ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { merchant: { contains: q, mode: 'insensitive' } }] } : {})
    },
    orderBy: { datePosted: 'desc' },
    take: 200,
    select: { plaidTxnId: true, name: true, merchant: true, amount: true, datePosted: true }
  });
  // apply client-side filter for categories / large
  const filtered = txns.filter(t => {
    if (filter === 'All') return true;
    if (filter === 'Large') return Number(t.amount) >= 200;
    const s = `${t.merchant ?? ''} ${t.name}`.toLowerCase();
    const map: Record<string,string[]> = {
      Dining: ['cafe','coffee','starbucks','restaurant','grill','burger','pizza','chipotle','mcdonald','kfc','taco'],
      Groceries: ['grocery','market','whole foods','trader joe','walmart','safeway','costco','kroger','aldi'],
      Transport: ['uber','lyft','shell','chevron','exxon','bp','gas','fuel']
    };
    return (map[filter]||[]).some(w=>s.includes(w));
  });
  return (
    <div className="space-y-4">
      {txns.length === 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-1">Connect a bank (Sandbox)</h3>
          <p className="text-sm text-subtext mb-3">You won’t see anyone else’s data. Link a sandbox account to populate your dashboard.</p>
          <div className="flex gap-3">
            <PlaidLinkButton />
            <form action="/api/demo/seed" method="POST"><button className="btn btn-ghost" type="submit">Load sample data</button></form>
          </div>
        </div>
      )}
      <form className="flex gap-2">
        <input name="q" defaultValue={q} className="px-3 py-2 rounded-lg bg-panel border border-border w-72" placeholder="Search…" />
        <button className="btn btn-ghost" type="submit">Search</button>
        {(() => {
          const on = new URLSearchParams();
          if (q) on.set('q', q);
          on.set('disconnected','1');
          const off = new URLSearchParams();
          if (q) off.set('q', q);
          const href = includeDisc ? `?${off.toString()}` : `?${on.toString()}`;
          return (
            <a className={`btn btn-ghost ${includeDisc ? 'border border-primary' : ''}`} href={href}>Include disconnected</a>
          );
        })()}
      </form>
      <Card className="p-4">
        <h2 className="mb-3 font-medium">Recent Transactions</h2>
        <div className="flex gap-2 mb-3 text-xs">
          {['All','Large','Dining','Groceries','Transport'].map(name => {
            const ps = new URLSearchParams(); if (q) ps.set('q', q); if (includeDisc) ps.set('disconnected','1'); ps.set('f', name);
            const href = `?${ps.toString()}`;
            return <a key={name} className={`px-2 py-1 rounded-pill border ${filter===name?'border-primary text-primary':'border-border text-subtext hover:text-text'}`} href={href} aria-label={`Filter ${name}`}>{name}</a>;
          })}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-subtext sticky top-0 bg-panel/95 backdrop-blur supports-[backdrop-filter]:bg-panel/75">
              <tr className="[&>th]:py-2 [&>th]:text-left border-b border-border">
                <th>Date</th><th>Merchant / Name</th><th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.plaidTxnId} className="[&>td]:py-2 border-t border-border odd:bg-black/5">
                  <td>{new Date(t.datePosted).toLocaleDateString()}</td>
                  <td>{t.merchant ?? t.name}</td>
                  <td className={`text-right font-medium ${Number(t.amount) > 0 ? 'text-danger' : 'text-primary'}`}>${Number(t.amount).toFixed(2)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-subtext">
                    No results. Link a bank or load sample data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
