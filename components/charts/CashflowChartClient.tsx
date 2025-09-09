'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export type CashflowPoint = { day: string; inflow: number; outflow: number };

export default function CashflowChartClient({ data }: { data: CashflowPoint[] }) {
  if (!data || data.length === 0) return <div className="text-sm text-subtext">No data in this period.</div>;
  return (
    <BarChart width={760} height={280} data={data}>
      <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
      <XAxis dataKey="day" stroke="#9aa3b2" />
      <YAxis stroke="#9aa3b2" />
      <Tooltip contentStyle={{ background: '#12161c', border: '1px solid #1f2430', borderRadius: 12 }} />
      <Legend />
      <Bar dataKey="inflow" name="Inflow" fill="#2eb07a" radius={[6,6,0,0]} />
      <Bar dataKey="outflow" name="Outflow" fill="#ef4444" radius={[6,6,0,0]} />
    </BarChart>
  );
}

