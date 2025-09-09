import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/user';
import Card from '@/components/ui/Card';
import CopyInline from '@/components/ui/CopyInline';
export const dynamic = 'force-dynamic';

export default async function AccountsPage() {
  const user = await requireUser();
  const accounts = await prisma.account.findMany({
    where: { connection: { userId: user.id, status: 'active', revokedAt: null } },
    select: { accountId: true, name: true, type: true, subtype: true, available: true, isoCurrency: true }
  });
  return (
    <Card className="p-4">
      <h2 className="mb-4 font-medium">Accounts</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-subtext sticky top-0 bg-panel/95 backdrop-blur supports-[backdrop-filter]:bg-panel/75">
            <tr className="[&>th]:py-2 [&>th]:text-left border-b border-border">
              <th>Name</th><th>Type</th><th>Available</th><th>Currency</th><th>ID</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(a => (
              <tr key={a.accountId} className="[&>td]:py-2 border-t border-border odd:bg-black/5">
                <td className="font-medium">{a.name}</td>
                <td className="text-subtext">{a.type}{a.subtype ? ` / ${a.subtype}` : ''}</td>
                <td className="font-medium">${Number(a.available ?? 0).toFixed(2)}</td>
                <td>{a.isoCurrency ?? '—'}</td>
                <td className="text-subtext"><CopyInline value={a.accountId} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
