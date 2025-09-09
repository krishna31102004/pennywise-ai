import { NextRequest, NextResponse } from 'next/server';
import { jsonResponse, aiEnabled } from '@/lib/ai';
import { TOOL_REGISTRY, ToolName } from '@/lib/ai-tools';

export async function POST(req: NextRequest) {
  if (!aiEnabled(process.env.AI_ASK_ENABLED)) {
    return NextResponse.json({ ok: false, error: 'AI_ASK_DISABLED' }, { status: 400 });
  }
  const { q } = await req.json();

  const sys = `You plan queries over personal finance using ONLY these tools:
- getSpendByCategory({ category, from?, to? })
- getMerchantSpend({ merchant, from?, to? })
- getRecurring({ merchant? })

Return JSON:
{ "tool": "getSpendByCategory"|"getMerchantSpend"|"getRecurring", "args": { ... }, "finalTemplate": "Answer sentence with {{total}} etc." }`;
  const plan = await jsonResponse(sys, String(q || ''));
  const tool = (plan as any)?.tool as ToolName;
  const args = (plan as any)?.args || {};
  const tmpl = (plan as any)?.finalTemplate || 'Result: {{json}}';

  if (!tool || !(tool in TOOL_REGISTRY)) {
    return NextResponse.json({ ok: false, error: 'NO_TOOL' }, { status: 400 });
  }

  const result = await (TOOL_REGISTRY as any)[tool](args);
  const text = tmpl
    .replace('{{total}}', (result.total ?? '').toString())
    .replace('{{count}}', (result.count ?? '').toString())
    .replace('{{from}}', result.from ? new Date(result.from).toLocaleDateString() : '')
    .replace('{{to}}', result.to ? new Date(result.to).toLocaleDateString() : '')
    .replace('{{json}}', JSON.stringify(result));

  return NextResponse.json({ ok: true, tool, args, result, text });
}

