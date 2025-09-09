'use client';
import { useState } from 'react';

export default function AskPage() {
  const [q, setQ] = useState('');
  const [resp, setResp] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setResp(null);
    const r = await fetch('/api/ai/ask', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q })
    });
    const j = await r.json(); setResp(j); setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="mb-3 font-medium">Ask your money</h2>
        <form onSubmit={submit} className="flex gap-2">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="e.g., How much did I spend on groceries last month?"
            className="px-3 py-2 rounded-lg bg-panel border border-border w-[520px]"
          />
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Thinking…' : 'Ask'}</button>
        </form>
      </div>

      {resp && (
        <div className="card p-4">
          <div className="text-sm text-subtext mb-2">Tool: {resp.tool}</div>
          <div className="text-base">{resp.text}</div>
          <pre className="mt-3 text-xs text-subtext whitespace-pre-wrap">{JSON.stringify(resp.result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

