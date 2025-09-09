'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BarChart2, Banknote, ListTree, MessageSquare, Settings, Home, X, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PlaidLinkButton from '@/components/PlaidLinkButton';

function NavItem({ href, icon, children, onClick }: { href: string; icon: React.ReactNode; children: React.ReactNode; onClick?: () => void }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-black/20 text-subtext hover:text-text ${active ? 'text-text bg-black/10' : ''}`}
      href={href}
      onClick={onClick}
    >
      <span className="opacity-90">{icon}</span>
      <span>{children}</span>
    </Link>
  );
}

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:block h-full bg-panel border-r border-border p-4 sticky top-0">
        <div className="mb-6 text-lg font-semibold tracking-wide">Pennywise AI</div>
        <nav className="space-y-1 text-sm">
          <NavItem href="/dashboard" icon={<Home size={16}/>}>Dashboard</NavItem>
          <NavItem href="/accounts" icon={<Banknote size={16}/>}>Accounts</NavItem>
          <NavItem href="/transactions" icon={<ListTree size={16}/>}>Transactions</NavItem>
          <NavItem href="/ask" icon={<MessageSquare size={16}/>}>Ask</NavItem>
          <NavItem href="/insights" icon={<BarChart2 size={16}/>}>Insights</NavItem>
          <NavItem href="/settings" icon={<Settings size={16}/>}>Settings</NavItem>
        </nav>
        <div className="mt-6">
          <PlaidLinkButton />
        </div>
      </aside>

      {/* Mobile toggle button (appears in header area via position) */}
      <button aria-label="Open navigation" className="md:hidden btn btn-ghost fixed top-4 left-4 z-40" onClick={() => setOpen(true)}>
        <Menu size={18} />
      </button>

      {/* Mobile sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              aria-hidden
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed top-0 left-0 bottom-0 w-72 bg-panel border-r border-border p-4 z-50"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold tracking-wide">Pennywise AI</div>
                <button aria-label="Close navigation" className="btn btn-ghost" onClick={() => setOpen(false)}><X size={16}/></button>
              </div>
              <nav className="space-y-1 text-sm">
                <NavItem href="/dashboard" icon={<Home size={16}/>} onClick={() => setOpen(false)}>Dashboard</NavItem>
                <NavItem href="/accounts" icon={<Banknote size={16}/>} onClick={() => setOpen(false)}>Accounts</NavItem>
                <NavItem href="/transactions" icon={<ListTree size={16}/>} onClick={() => setOpen(false)}>Transactions</NavItem>
                <NavItem href="/ask" icon={<MessageSquare size={16}/>} onClick={() => setOpen(false)}>Ask</NavItem>
                <NavItem href="/insights" icon={<BarChart2 size={16}/>} onClick={() => setOpen(false)}>Insights</NavItem>
                <NavItem href="/settings" icon={<Settings size={16}/>} onClick={() => setOpen(false)}>Settings</NavItem>
              </nav>
              <div className="mt-6">
                <PlaidLinkButton />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

