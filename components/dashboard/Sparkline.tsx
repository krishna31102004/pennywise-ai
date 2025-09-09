'use client';
import { LineChart, Line } from 'recharts';

export default function Sparkline({ points, color = '#42d392' }: { points: number[]; color?: string }) {
  const data = points.map((v, i) => ({ i, v }));
  if (data.length === 0) return null;
  return (
    <div className="h-9">
      <LineChart width={120} height={36} data={data} margin={{ top: 6, bottom: 0, left: 0, right: 0 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </div>
  );
}

