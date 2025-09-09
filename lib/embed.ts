// lib/embed.ts
import { openai } from './ai';

export async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small',
    input: text.slice(0, 8000),
  });
  return res.data[0].embedding as number[];
}

