'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoadDemoButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function run() {
    setLoading(true);
    try {
      const r = await fetch('/api/demo/seed', { method: 'POST' });
      const j = await r.json();
      if (j?.ok) {
        setMsg('Sample data loaded');
        router.refresh();
      } else {
        setMsg('Seeding failed');
      }
    } catch {
      setMsg('Network error');
    } finally {
      setLoading(false);
      setTimeout(()=>setMsg(null), 2500);
    }
  }
  return (
    <div className="relative inline-flex">
      <button className="btn btn-ghost" onClick={run} disabled={loading}>{loading ? 'Seeding…' : 'Load sample data'}</button>
      {msg && <div className="fixed bottom-6 right-6 bg-panel border border-border rounded-xl px-4 py-2 shadow-card text-sm">{msg}</div>}
    </div>
  );
}

