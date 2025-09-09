'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function BalanceTrendClient({ points }: { points: { day: number; value: number }[] }) {
  if (!points || points.length === 0) {
    return <div className="text-sm text-subtext">No data yet. Run Refresh.</div>;
  }
  return (
    <LineChart width={760} height={280} data={points}>
      <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
      <XAxis dataKey="day" stroke="#9aa3b2" />
      <YAxis stroke="#9aa3b2" />
      <Tooltip contentStyle={{ background: '#12161c', border: '1px solid #1f2430', borderRadius: 12 }} />
      <Line type="monotone" dataKey="value" stroke="#42d392" dot={false} strokeWidth={2} />
    </LineChart>
  );
}
