import { prisma } from '@/lib/prisma';
import GenerateTipsButton from '@/components/GenerateTipsButton';
export const dynamic = 'force-dynamic';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

function money(n:number){ return `$${n.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`; }

export default async function InsightsPage() {
  const kpis = await prisma.insight.findMany({
    where: { type: 'kpi', period: '30d' },
    orderBy: { createdAt: 'desc' }, take: 12
  });
  const tips = await prisma.adviceLog.findMany({
    orderBy: { createdAt: 'desc' }, take: 12,
    select: { id: true, aiText: true, provenance: true, createdAt: true }
  });

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h2 className="mb-4 font-medium">Latest KPIs (30d)</h2>
        <div className="mb-3"><GenerateTipsButton /></div>
        {kpis.length === 0 ? <p className="text-subtext text-sm">No KPI insights yet. Run a refresh.</p> : (
          <ul className="space-y-3">
            {kpis.map(k => {
              const p = (k.payload as any) || {};
              return (
                <li key={k.id} className="border border-border rounded-xl p-3 bg-black/20">
                  <div className="text-subtext text-xs mb-2">kpi • 30d • {new Date(k.createdAt).toLocaleString()}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <Mini label="Available" value={money(Number(p.available ?? 0))}/>
                    <Mini label="MTD Spend" value={money(Number(p.monthSpend ?? 0))}/>
                    <Mini label="Avg Daily Burn" value={money(Number(p.avgDailyBurn ?? 0))}/>
                    <Mini label="Runway" value={`${Number(p.runwayDays ?? 0)} days`}/>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 font-medium">AI Tips</h2>
        {tips.length === 0 ? <p className="text-subtext text-sm">No AI tips yet. Run a refresh to generate tips.</p> : (
          <ul className="space-y-3">
            {tips.map(t => (
              <li key={t.id} className="border border-border rounded-xl p-3 bg-black/20">
                <div className="flex items-center justify-between mb-1">
                  <Badge tone="success">{t.provenance || 'ai'}</Badge>
                  <div className="text-subtext text-xs">{new Date(t.createdAt).toLocaleString()}</div>
                </div>
                <p className="text-sm leading-relaxed">{t.aiText}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-subtext">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
