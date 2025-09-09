import { ReactNode } from 'react';
import { clsx } from 'clsx';

export default function Badge({ children, tone='neutral' }: { children: ReactNode; tone?: 'neutral'|'success'|'warn'|'danger'|'info' }) {
  const map = {
    neutral: 'bg-black/20 border border-border text-subtext',
    success: 'bg-primary/15 text-primary border border-primary/30',
    warn: 'bg-warn/15 text-warn border border-warn/30',
    danger: 'bg-danger/15 text-danger border border-danger/30',
    info: 'bg-info/15 text-info border border-info/30'
  } as const;
  return <span className={clsx('px-2 py-1 rounded-lg text-xs', map[tone])}>{children}</span>;
}
