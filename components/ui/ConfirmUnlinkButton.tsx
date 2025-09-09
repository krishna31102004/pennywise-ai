'use client';
import React from 'react';

export default function ConfirmUnlinkButton({ checkboxId, children }: { checkboxId: string; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="btn btn-ghost"
      onClick={(e) => {
        const cb = document.getElementById(checkboxId) as HTMLInputElement | null;
        if (cb?.checked) {
          const ok = window.confirm('This will remove the bank and DELETE its accounts & transactions. Continue?');
          if (!ok) e.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}

