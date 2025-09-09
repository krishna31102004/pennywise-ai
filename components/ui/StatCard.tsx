import { ReactNode } from 'react';
import Card from './Card';
import { clsx } from 'clsx';

export default function StatCard({ label, value, icon, delta }: { label: string; value: ReactNode; icon?: ReactNode; delta?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-subtext flex items-center gap-2">{icon}{label}</div>
      <div className="text-2xl font-semibold mt-1 flex items-end justify-between">
        <span>{value}</span>
        {delta ? <span className="px-2 py-0.5 rounded-pill text-xs border" style={{ borderColor: 'rgba(66,211,146,.3)' }}>{delta}</span> : null}
      </div>
    </Card>
  );
}
