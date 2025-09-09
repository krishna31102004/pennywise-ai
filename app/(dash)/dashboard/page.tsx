import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/user';
import StatCard from '@/components/ui/StatCard';
import ChartCard from '@/components/ui/ChartCard';
import { Wallet, Flame, Timer, PieChart, TrendingUp, TrendingDown } from 'lucide-react';
import PeriodSelector from '@/components/dashboard/PeriodSelector';
import PlaidLinkButton from '@/components/PlaidLinkButton';
import Sparkline from '@/components/dashboard/Sparkline';
import CashflowChartClient, { CashflowPoint } from '@/components/charts/CashflowChartClient';
import TopCategoriesClient from '@/components/charts/TopCategoriesClient';
export const dynamic = 'force-dynamic';

function money(n: number){ return `$${n.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`; }

type PeriodKey = 'mtd'|'30d'|'90d';

function periodBounds(p: PeriodKey) {
  const now = new Date();
  if (p === 'mtd') { const start = new Date(now.getFullYear(), now.getMonth(), 1); return { start, end: now, prevStart: new Date(start.getTime() - (now.getDate())*86400000), prevEnd: start }; }
  if (p === '90d') { const end = now; const start = new Date(end.getTime() - 89*86400000); const prevEnd = new Date(start.getTime() - 1); const prevStart = new Date(prevEnd.getTime() - 89*86400000); return { start, end, prevStart, prevEnd }; }
  // default 30d
  const end = now; const start = new Date(end.getTime() - 29*86400000); const prevEnd = new Date(start.getTime() - 1); const prevStart = new Date(prevEnd.getTime() - 29*86400000); return { start, end, prevStart, prevEnd };
}

function deltaPct(cur: number, prev: number) {
  if (!isFinite(cur) || !isFinite(prev) || prev === 0) return 0;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

function classifyFallback(merchant?: string | null, name?: string | null) {
  const s = `${merchant ?? ''} ${name ?? ''}`.toLowerCase();
  const any = (arr: string[]) => arr.some(w => s.includes(w));
  if (any(['cafe','coffee','starbucks','restaurant','grill','burger','pizza','chipotle','mcdonald','kfc','taco'])) return 'Dining';
  if (any(['grocery','market','whole foods','trader joe','walmart','safeway','costco','kroger','aldi'])) return 'Groceries';
  if (any(['uber','lyft','shell','chevron','exxon','bp','gas','fuel'])) return 'Transport';
  if (any(['rent','landlord','apartment'])) return 'Rent';
  if (any(['netflix','spotify','hulu','steam','playstation','xbox'])) return 'Entertainment';
  return 'Other';
}

export default async function Dashboard(props: any) {
  const user = await requireUser();
  const sp = props?.searchParams && typeof props.searchParams.then === 'function'
    ? await props.searchParams
    : (props?.searchParams ?? {});
  const p: PeriodKey = (sp?.period as PeriodKey) || '30d';
  const includeAll = String(sp?.include || '') === 'all';
  const { start, end, prevStart, prevEnd } = periodBounds(p);

  const accounts = await prisma.account.findMany({ where: { connection: { userId: user.id, ...(includeAll ? {} : { status: 'active', revokedAt: null }) } }, select: { available: true, current: true } });
  const available = accounts.reduce((s, a) => s + Number(a.available ?? 0), 0);
  const netWorth = accounts.reduce((s, a) => s + Number(a.current ?? a.available ?? 0), 0);

  const txns = await prisma.transaction.findMany({
    where: { datePosted: { gte: start, lte: end }, account: { connection: { userId: user.id, ...(includeAll ? {} : { status: 'active', revokedAt: null }) } } },
    select: { amount: true, datePosted: true, merchant: true, name: true, categories: { select: { category: { select: { name: true } } } } }
  });
  const txPrev = await prisma.transaction.findMany({ where: { datePosted: { gte: prevStart, lte: prevEnd }, account: { connection: { userId: user.id, ...(includeAll ? {} : { status: 'active', revokedAt: null }) } } }, select: { amount: true } });

  const spend = txns.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
  const spendPrev = txPrev.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
  const income = 0; // no negative amounts in this dataset; keep 0 for demo
  const incomePrev = 0;
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime())/86400000));
  const avgDaily = spend / days;
  const avgDailyPrev = spendPrev / Math.max(1, Math.ceil((prevEnd.getTime() - prevStart.getTime())/86400000));
  const runway = avgDaily > 0 ? Math.round(available / avgDaily) : 9999;
  const savingsRate = Math.max(0, Math.min(1, 1 - (spend / Math.max(income, 1)))) * 100;

  // Sparklines from daily spend
  const dayKey = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10);
  const buckets = new Map<string, number>();
  for (let i = 0; i < Math.min(7, days); i++) buckets.set(dayKey(new Date(end.getTime() - i*86400000)), 0);
  txns.forEach(t => { const k = dayKey(new Date(t.datePosted)); if (buckets.has(k)) buckets.set(k, (buckets.get(k) || 0) + Number(t.amount)); });
  const spark = Array.from(buckets.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([,v])=>v);

  // Cashflow chart (daily)
  const cfMap = new Map<string, { inflow: number; outflow: number }>();
  for (let d = new Date(start); d <= end; d = new Date(d.getTime()+86400000)) cfMap.set(dayKey(d), { inflow: 0, outflow: 0 });
  txns.forEach(t => { const k = dayKey(new Date(t.datePosted)); const cur = cfMap.get(k)!; const amt = Number(t.amount); cur.outflow += Math.max(0, amt); });
  const cashflow: CashflowPoint[] = Array.from(cfMap.entries()).map(([k,v]) => ({ day: k.slice(5), inflow: Number(v.inflow.toFixed(2)), outflow: Number(v.outflow.toFixed(2)) }));

  // Top categories
  const catTotals = new Map<string, number>();
  for (const t of txns) {
    const cat = t.categories[0]?.category?.name || classifyFallback(t.merchant, t.name);
    catTotals.set(cat, (catTotals.get(cat) ?? 0) + Number(t.amount));
  }
  const sortedCats = Array.from(catTotals.entries()).sort((a,b)=>b[1]-a[1]);
  const top7 = sortedCats.slice(0,7);
  const other = sortedCats.slice(7).reduce((s, [,v])=>s+v, 0);
  if (other > 0) top7.push(['Other', other]);
  const topData = top7.map(([name,value])=>({ name, value: Number(value.toFixed(2)) }));

  // Budget progress (current month)
  const monthStart = new Date(end.getFullYear(), end.getMonth(), 1);
  const monthEnd = new Date(end.getFullYear(), end.getMonth()+1, 0);
  const budgets = await prisma.budget.findMany({ where: { userId: user.id, period: `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}` } });
  const monthTx = await prisma.transaction.findMany({ where: { datePosted: { gte: monthStart, lte: monthEnd }, account: { connection: { userId: user.id, status: 'active', revokedAt: null } } }, select: { amount: true, categories: { select: { category: { select: { id: true, name: true } } } } } });
  function spentFor(catId?: string | null) {
    return monthTx.filter(t => Number(t.amount) > 0 && (!catId || t.categories[0]?.category?.id === catId)).reduce((s,t)=> s + Number(t.amount), 0);
  }

  // Recent activity (with optional category filter or large)
  const catFilter = sp?.cat as string | undefined;
  const recent = await prisma.transaction.findMany({
    where: { datePosted: { gte: start, lte: end }, account: { connection: { userId: user.id, ...(includeAll ? {} : { status: 'active', revokedAt: null }) } } },
    orderBy: { datePosted: 'desc' },
    take: 15,
    select: { plaidTxnId: true, name: true, merchant: true, amount: true, datePosted: true, categories: { select: { category: { select: { name: true } } } } }
  });
  const recentFiltered = recent.filter(r => {
    const cat = r.categories[0]?.category?.name || classifyFallback(r.merchant, r.name);
    if (!catFilter) return true;
    if (catFilter === 'Large') return Number(r.amount) >= 200;
    return cat === catFilter;
  });

  // Deltas
  const dAvail = 0; // no period-based available snapshot; keep 0
  const dNet = 0;
  const dSpend = deltaPct(spend, spendPrev);
  const dIncome = deltaPct(income, incomePrev);
  const dBurn = deltaPct(avgDaily, avgDailyPrev);
  const dSave = 0;

  const disconnectedCount = await prisma.connection.count({ where: { userId: user.id, NOT: { status: 'active' } } });

  return (
    <div className="space-y-6">
      {disconnectedCount > 0 && !includeAll && (
        <div className="card p-3 flex items-center justify-between">
          <div className="text-sm text-subtext">You have disconnected data hidden.</div>
          <div className="flex gap-2">
            {(() => { const params = new URLSearchParams(); params.set('period', p); params.set('include','all'); return (
              <a className="btn btn-ghost" href={`?${params.toString()}`}>Show</a>
            ); })()}
            <a className="btn btn-ghost" href="/settings">Manage</a>
          </div>
        </div>
      )}
      {accounts.length === 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-1">Connect a bank (Sandbox)</h3>
          <p className="text-sm text-subtext mb-3">You won’t see anyone else’s data. Link a sandbox account to populate your dashboard.</p>
          <div className="flex gap-3">
            <PlaidLinkButton />
            <form action="/api/demo/seed" method="POST"><button className="btn btn-ghost" type="submit">Load sample data</button></form>
          </div>
        </div>
      )}
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <div className="flex items-center gap-3">
          <PeriodSelector />
        </div>
      </div>

      {/* KPI Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard label="Available" value={<div className="flex items-end justify-between w-full"><span>{money(available)}</span><Sparkline points={spark} /></div>} icon={<Wallet size={14} className="text-primary" />} />
        <StatCard label="Net Worth" value={money(netWorth)} icon={<TrendingUp size={14} className="text-primary" />} />
        <StatCard label="Spend" value={money(spend)} icon={<PieChart size={14} className="text-primary" />} />
        <StatCard label="Income" value={money(income)} icon={<TrendingUp size={14} className="text-primary" />} />
        <StatCard label="Avg Daily Burn" value={money(avgDaily)} icon={<Flame size={14} className="text-primary" />} />
        <StatCard label="Savings Rate" value={`${savingsRate.toFixed(0)}%`} icon={<Timer size={14} className="text-primary" />} />
      </section>

      {/* Main Charts Row */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard title="Cashflow (In vs Out)"><CashflowChartClient data={cashflow} /></ChartCard>
        <ChartCard title="Top Categories"><TopCategoriesClient data={topData} /></ChartCard>
      </section>

      {/* Insights & Activity Row */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard title="Budget Progress">
          {budgets.length === 0 ? (
            <div className="text-sm text-subtext">No budgets yet. <a className="underline" href="/settings">Create budgets in Settings</a>.</div>
          ) : (
            <div className="space-y-3">
              {budgets.map(b => {
                const spent = spentFor(b.categoryId);
                const pct = Math.min(100, Math.round((Number(spent) / Math.max(1, Number(b.amount))) * 100));
                const tone = pct < 70 ? 'bg-primary' : pct < 90 ? 'bg-warn' : 'bg-danger';
                return (
                  <div key={b.id} className="text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-subtext">{b.categoryId ? (monthTx.find(t=>t.categories[0]?.category?.id===b.categoryId)?.categories[0]?.category?.name || 'Category') : 'All spending'}</div>
                      <div className="text-subtext">${Number(spent).toFixed(2)} / ${Number(b.amount).toFixed(2)} · {pct}%</div>
                    </div>
                    <div className="h-2 w-full bg-black/20 rounded-pill overflow-hidden">
                      <div className={`h-2 ${tone}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>
        <ChartCard title={`Recent Activity${catFilter ? ` · ${catFilter}` : ''}`}>
          <div className="flex gap-2 mb-3 text-xs">
            {['All','Large','Dining','Groceries','Transport','Rent','Entertainment'].map(f => {
              const val = f === 'All' ? '' : f;
              const url = new URLSearchParams(); url.set('period', p); if (val) url.set('cat', val);
              return <a key={f} className={`px-2 py-1 rounded-lg border ${val===catFilter? 'border-primary text-primary' : 'border-border text-subtext hover:text-text'}`} href={`?${url.toString()}`}>{f}</a>;
            })}
          </div>
          <div className="space-y-2">
            {recentFiltered.map(r => {
              const cat = r.categories[0]?.category?.name || classifyFallback(r.merchant, r.name);
              return (
                <div key={r.plaidTxnId} className="flex items-center justify-between border border-border rounded-xl px-3 py-2 bg-black/15">
                  <div className="text-sm">
                    <div className="font-medium">{r.merchant ?? r.name}</div>
                    <div className="text-xs text-subtext">{new Date(r.datePosted).toLocaleDateString()} · {cat}</div>
                  </div>
                  <div className="text-sm font-semibold">${Number(r.amount).toFixed(2)}</div>
                </div>
              );
            })}
            {recentFiltered.length === 0 && <div className="text-sm text-subtext">No activity in this period.</div>}
          </div>
        </ChartCard>
      </section>
    </div>
  );
}
