'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function TopCategoriesClient({ data }: { data: { name: string; value: number }[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const period = sp.get('period') || '30d';
  const activeCat = sp.get('cat') || '';

  function toggle(name: string) {
    const params = new URLSearchParams(sp.toString());
    if (params.get('cat') === name) params.delete('cat');
    else params.set('cat', name);
    router.push(`${pathname}?${params.toString()}`);
  }

  if (!data || data.length === 0) return <div className="text-sm text-subtext">No data in this period.</div>;
  return (
    <BarChart width={760} height={280} data={data}>
      <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
      <XAxis dataKey="name" stroke="#9aa3b2" />
      <YAxis stroke="#9aa3b2" />
      <Tooltip contentStyle={{ background: '#12161c', border: '1px solid #1f2430', borderRadius: 12 }} />
      <Bar dataKey="value" fill="#42d392" radius={[6,6,0,0]} onClick={(p) => toggle(p?.name as string)} />
    </BarChart>
  );
}

