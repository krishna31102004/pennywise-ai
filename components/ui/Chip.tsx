'use client';
import { clsx } from 'clsx';
import React from 'react';

type Props = {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
};

export default function Chip({ active, onClick, children, ariaLabel }: Props) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        'px-2 py-1 rounded-pill text-xs border focus:outline-none focus:shadow-glow',
        active ? 'border-primary text-primary' : 'border-border text-subtext hover:text-text'
      )}
    >
      {children}
    </button>
  );
}

