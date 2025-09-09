import Card from '@/components/ui/Card';
import UnlinkActions from '@/components/settings/UnlinkActions';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getPlaidClient } from '@/lib/plaid';
import { decrypt } from '@/lib/crypto';
import { requireUser } from '@/lib/user';

function monthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export default async function SettingsPage() {
  const linked = Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
  const user = await requireUser();
  const period = monthKey();
  const cats = await prisma.category.findMany({ where: { parentId: null }, orderBy: { name: 'asc' } });
  const budgets = await prisma.budget.findMany({
    where: { userId: user.id, period },
    orderBy: { amount: 'desc' }
  });

  async function createBudget(formData: FormData) {
    'use server';
    const user = await requireUser();
    const amount = String(formData.get('amount') || '0');
    const period = String(formData.get('period') || monthKey());
    const categoryId = String(formData.get('categoryId') || '') || null;
    const rollover = formData.get('rollover') === 'on';
    await prisma.budget.create({ data: { userId: user.id, amount, period, categoryId, rollover } });
    revalidatePath('/dashboard');
    revalidatePath('/settings');
  }

  async function deleteBudget(formData: FormData) {
    'use server';
    const id = String(formData.get('id'));
    await prisma.budget.delete({ where: { id } });
    revalidatePath('/dashboard');
    revalidatePath('/settings');
  }

  return (
    <div className="space-y-4">
      <ConnectionsCard />
      <Card className="p-4">
        <h2 className="mb-2 font-medium">Environment</h2>
        <p className="text-sm text-subtext">Plaid linked: <span className="text-text font-medium">{linked ? 'Yes' : 'No'}</span></p>
      </Card>

      <Card className="p-4">
        <h2 className="mb-2 font-medium">Maintenance</h2>
        <form action="/jobs/refresh" method="GET">
          <button className="btn btn-primary" type="submit">Run Refresh</button>
        </form>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 font-medium">Budgets (current month)</h2>
        <form action={createBudget} className="flex flex-wrap items-end gap-3 mb-4" aria-label="Create budget">
          <div className="flex flex-col">
            <label className="text-xs text-subtext" htmlFor="period">Period</label>
            <input id="period" name="period" defaultValue={period} className="px-3 py-2 rounded-lg bg-panel border border-border w-36" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-subtext" htmlFor="categoryId">Category</label>
            <select id="categoryId" name="categoryId" className="px-3 py-2 rounded-lg bg-panel border border-border w-56">
              <option value="">All spending</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-subtext" htmlFor="amount">Amount (USD)</label>
            <input id="amount" name="amount" type="number" step="0.01" placeholder="500" className="px-3 py-2 rounded-lg bg-panel border border-border w-36" required />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-subtext">
            <input type="checkbox" name="rollover" className="accent-primary" /> Rollover
          </label>
          <button className="btn btn-primary" type="submit">Add Budget</button>
        </form>

        {budgets.length === 0 ? (
          <p className="text-sm text-subtext">No budgets yet. Add one above to track progress on the dashboard.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-subtext">
                <tr className="[&>th]:py-2 [&>th]:text-left border-b border-border">
                  <th>Period</th><th>Category</th><th>Amount</th><th>Rollover</th><th></th>
                </tr>
              </thead>
              <tbody>
                {await Promise.all(budgets.map(async b => {
                  const cat = b.categoryId ? await prisma.category.findUnique({ where: { id: b.categoryId } }) : null;
                  return (
                    <tr key={b.id} className="[&>td]:py-2 border-t border-border">
                      <td>{b.period}</td>
                      <td>{cat?.name ?? 'All'}</td>
                      <td>${Number(b.amount).toFixed(2)}</td>
                      <td>{b.rollover ? 'Yes' : 'No'}</td>
                      <td>
                        <form action={deleteBudget}>
                          <input type="hidden" name="id" value={b.id} />
                          <button className="btn btn-ghost" type="submit" aria-label={`Delete budget ${b.period}`}>Delete</button>
                        </form>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

  async function ConnectionsCard() {
  const user = await requireUser();
  const conns = await prisma.connection.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });

  async function unlink(formData: FormData) {
    'use server';
    const id = String(formData.get('id'));
    const hard = formData.get('hard') === 'on';
  const user = await requireUser();
    const conn = await prisma.connection.findFirst({ where: { id, userId: user.id } });
    if (!conn) return;
    try {
      const plaid = getPlaidClient();
      const access_token = decrypt(conn.accessTokenEnc);
      await plaid.itemRemove({ access_token });
    } catch {}
    await prisma.connection.update({ where: { id: conn.id }, data: { status: 'revoked', revokedAt: new Date() } });
    if (hard) {
      const accounts = await prisma.account.findMany({ where: { connectionId: conn.id }, select: { id: true } });
      const accountIds = accounts.map(a => a.id);
      if (accountIds.length) {
        const txns = await prisma.transaction.findMany({ where: { accountId: { in: accountIds } }, select: { id: true } });
        const txnIds = txns.map(t => t.id);
        if (txnIds.length) {
          await prisma.txnCategory.deleteMany({ where: { txnId: { in: txnIds } } });
          await prisma.transaction.deleteMany({ where: { id: { in: txnIds } } });
        }
        await prisma.account.deleteMany({ where: { id: { in: accountIds } } });
      }
    }
    await prisma.auditLog.create({ data: { userId: user.id, action: 'LINK_REMOVE', target: conn.id, meta: { hard } } });
    revalidatePath('/settings');
    revalidatePath('/dashboard');
  }

  return (
    <Card className="p-4">
      <h2 className="mb-2 font-medium">Connections</h2>
      {conns.length === 0 ? <p className="text-sm text-subtext">No connections. Link a bank from the dashboard.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-subtext">
              <tr className="[&>th]:py-2 [&>th]:text-left border-b border-border">
                <th>Institution</th><th>Status</th><th>Created</th><th>Remove data</th><th></th>
              </tr>
            </thead>
            <tbody>
              {conns.map(c => (
                <tr key={c.id} className="[&>td]:py-2 border-t border-border">
                  <td>{c.institution}</td>
                  <td>{c.status}</td>
                  <td>{new Date(c.createdAt).toLocaleString()}</td>
                  <td><UnlinkActions connectionId={c.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
