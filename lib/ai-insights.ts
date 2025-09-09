// lib/ai-insights.ts
import { jsonResponse } from './ai';
import { prisma } from './prisma';
import { embed } from './embed';
import { setAdviceVector } from './ann';

function fallbackTips(k: any): string[] {
  const tips: string[] = [];
  const available = Number(k?.available ?? 0);
  const monthSpend = Number(k?.monthSpend ?? 0);
  const burn = Number(k?.avgDailyBurn ?? 0);
  const runway = Number(k?.runwayDays ?? 0);
  if (burn > 0 && runway > 0 && runway < 60) {
    tips.push(`Runway is ${runway} days. Cap discretionary spend for 30 days to extend runway.`);
  }
  if (monthSpend > 0 && burn > 0) {
    tips.push(`You spent ${monthSpend.toFixed(2)} this month. Set a weekly cap near ${(burn*7).toFixed(0)} to smooth cash flow.`);
  }
  if (available > 0 && burn > 0) {
    const bufferWeeks = Math.max(2, Math.min(8, Math.floor((available / burn) / 7)));
    tips.push(`Keep ${bufferWeeks}-weeks of burn in checking; move excess to a high-yield account.`);
  }
  return tips.slice(0, 3);
}

export async function writeInsights(userId: string, kpi: any) {
  try {
    let texts: string[] | null = null;

    if (process.env.OPENAI_API_KEY) {
      const sys = 'You are a concise personal finance coach. Generate at most 3 actionable, specific tips.';
      const usr = `KPIs snapshot (30d window): ${JSON.stringify(kpi)}.
Return JSON array (max 3):
[
  { "severity": "low"|"medium"|"high", "category": "spend"|"cashflow"|"budget"|"other", "aiText": "one-sentence tip" }
]`;

      try {
        const out = await jsonResponse(sys, usr);
        if (Array.isArray(out) && out.length) {
          texts = out.slice(0, 3)
            .map((t: any) => String(t.aiText || '').trim())
            .filter((s: string) => s.length > 0)
            .map((s: string) => s.slice(0, 600));
        }
      } catch {
        // fall through to heuristics
      }
    }

    if (!texts || texts.length === 0) {
      texts = fallbackTips(kpi);
    }

    let created = 0;
    for (const text of texts) {
      const row = await prisma.adviceLog.create({
        data: {
          userId,
          promptContext: kpi,
          embedding: [],
          aiText: text,
          provenance: process.env.OPENAI_API_KEY ? 'ai:kpi' : 'heuristic:kpi',
        },
      });
      try {
        if (process.env.OPENAI_API_KEY) {
          const vec = await embed(text);
          await setAdviceVector(row.id, vec);
        }
      } catch {}
      created++;
    }
    return { created };
  } catch {
    return { created: 0 };
  }
}
