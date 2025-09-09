// lib/ai.ts
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // server only
});

export function aiEnabled(flagEnv?: string) {
  // Feature flag helper for OpenAI-backed paths. If a flag is explicitly
  // set to 'false', disable. Otherwise enable when a key exists.
  if (flagEnv === 'false') return false;
  return Boolean(process.env.OPENAI_API_KEY);
}

export type JsonValue = Record<string, any> | any[];

export async function jsonResponse(
  system: string,
  user: string,
  model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
) {
  const res = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      { role: 'system', content: `${system}\nRespond ONLY with valid JSON.` },
      { role: 'user', content: user }
    ]
  });
  const text = res.choices[0]?.message?.content?.trim() || '{}';
  try { return JSON.parse(text) as JsonValue; } catch { return { error: 'invalid_json', raw: text }; }
}
