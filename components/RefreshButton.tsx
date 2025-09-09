'use client';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

type Refreshed = { txns: number; accounts: number; insights: number };

export default function RefreshButton() {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/jobs/refresh', { method: 'GET' });
      const json = await res.json();
      if (json?.ok) {
        const r: Refreshed | undefined = json?.refreshed;
        setToast(`Refresh complete · ${r?.accounts ?? 0} connections, ${r?.txns ?? 0} txns, ${r?.insights ?? 0} insights`);
        router.refresh();
      } else {
        setToast('Refresh failed: unexpected response');
      }
    } catch (e) {
      setToast('Refresh failed: network error');
    } finally {
      setLoading(false);
      setTimeout(() => setToast(null), 4000);
    }
  }, [router]);

  return (
    <>
      <button className="btn btn-ghost" onClick={run} disabled={loading}>
        {loading ? 'Refreshing…' : 'Run Refresh'}
      </button>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-panel border border-border text-text rounded-xl px-4 py-3 shadow-card">
            {toast}
          </div>
        </div>
      )}
    </>
  );
}

