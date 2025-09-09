'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const OPTIONS = [
  { label: 'This month', value: 'mtd' },
  { label: 'Last 30d', value: '30d' },
  { label: 'Last 90d', value: '90d' },
];

export default function PeriodSelector() {
  const sp = useSearchParams();
  const current = sp.get('period') || '30d';
  const router = useRouter();
  const pathname = usePathname();

  function setPeriod(value: string) {
    const params = new URLSearchParams(sp.toString());
    params.set('period', value);
    params.delete('cat'); // reset category filter when period changes
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div role="tablist" aria-label="Select period" className="inline-flex items-center gap-1 bg-panel border border-border rounded-xl p-1">
      {OPTIONS.map(o => (
        <button
          key={o.value}
          role="tab"
          aria-selected={current === o.value}
          onClick={() => setPeriod(o.value)}
          className={`px-3 py-1 rounded-lg text-sm ${current === o.value ? 'bg-black/20 text-text' : 'text-subtext hover:text-text'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

