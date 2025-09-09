'use client';
import { useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';

export default function PlaidLinkButton() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/plaid/link-token', { method: 'POST' });
        const j = await r.json();
        setLinkToken(j.link_token);
      } catch {
        setLinkToken(null);
      }
    })();
  }, []);
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token, metadata) => {
      await fetch('/api/plaid/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token, institution: metadata.institution?.name }),
      });
      window.location.reload();
    },
  });
  return <button className="btn btn-primary" onClick={() => open()} disabled={!ready}>Link a bank (Sandbox)</button>;
}
