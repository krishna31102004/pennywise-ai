'use client';
import { useState } from 'react';
import { Copy } from 'lucide-react';

export default function CopyInline({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  const short = value.length > 10 ? `${value.slice(0,6)}…${value.slice(-4)}` : value;
  return (
    <button
      type="button"
      onClick={async () => { try { await navigator.clipboard.writeText(value); setOk(true); setTimeout(()=>setOk(false), 1500);} catch {} }}
      className="inline-flex items-center gap-1 text-subtext hover:text-text focus:outline-none focus:shadow-glow"
      title={ok ? 'Copied!' : 'Copy ID'}
      aria-label={ok ? 'Copied' : 'Copy ID'}
    >
      <span>{short}</span>
      <Copy size={12} />
    </button>
  );
}

