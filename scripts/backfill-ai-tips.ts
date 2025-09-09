import { prisma } from '../lib/prisma';
import { writeInsights } from '../lib/ai-insights';

async function main() {
  const user = (await prisma.user.findFirst()) ||
               (await prisma.user.upsert({ where: { anonId: 'demo' }, update: {}, create: { anonId: 'demo' } }));

  const snaps = await prisma.insight.findMany({
    where: { type: 'kpi', period: '30d' },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });

  let total = 0;
  for (const s of snaps.reverse()) {
    const res = await writeInsights(user.id, s.payload);
    total += res.created;
  }

  console.log(`Backfill complete. Tips created: ${total}`);
}

main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});

