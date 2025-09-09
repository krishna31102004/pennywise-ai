'use client';
import { useState } from 'react';
import ConfirmUnlinkButton from '@/components/ui/ConfirmUnlinkButton';
import { useRouter } from 'next/navigation';

export default function UnlinkActions({ connectionId }: { connectionId: string }) {
  const [hard, setHard] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/plaid/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId, hardDelete: hard })
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Unlink failed');
      const msg = j.mode === 'hard'
        ? `Removed ${j.removed?.accounts ?? 0} accounts and ${j.removed?.txns ?? 0} transactions.`
        : 'Connection revoked. Data is now hidden.';
      setToast(msg);
      router.refresh();
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      setToast(err?.message || 'Unlink failed');
      setTimeout(() => setToast(null), 4000);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-3">
      <label className="inline-flex items-center gap-2 text-xs text-subtext">
        <input type="checkbox" checked={hard} onChange={(e) => setHard(e.target.checked)} className="accent-primary" />
        Delete accounts & txns
      </label>
      <ConfirmUnlinkButton checkboxId={`hard-${connectionId}`}>{/* id not used here but component expects one */}Unlink</ConfirmUnlinkButton>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-panel border border-border rounded-xl px-4 py-2 shadow-card text-sm">{toast}</div>
      )}
    </form>
  );
}

