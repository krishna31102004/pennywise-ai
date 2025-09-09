'use client';
import { useState } from 'react';

export default function GenerateTipsButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function run() {
    setLoading(true);
    try {
      const r = await fetch('/jobs/refresh');
      const j = await r.json();
      if (j?.ok) setMsg('Generated tips from latest KPIs.');
      else setMsg('Refresh failed.');
    } catch { setMsg('Network error.'); }
    finally { setLoading(false); setTimeout(()=>setMsg(null), 3000); }
  }
  return (
    <div className="relative inline-flex">
      <button className="btn btn-primary" onClick={run} disabled={loading}>{loading ? 'Generating…' : 'Generate tips'}</button>
      {msg && <div className="fixed bottom-6 right-6 bg-panel border border-border rounded-xl px-4 py-2 shadow-card text-sm">{msg}</div>}
    </div>
  );
}

