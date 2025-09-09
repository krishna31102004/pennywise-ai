// lib/ann.ts
import { prisma } from './prisma';

export async function setAdviceVector(adviceId: string, vec: number[]) {
  const literal = `(${vec.join(',')})`;
  await prisma.$executeRawUnsafe(
    'UPDATE "AdviceLog" SET "embedding_vec" = $1::vector WHERE id = $2',
    literal,
    adviceId
  );
}

export async function nearestAdvice(vec: number[], k = 8) {
  const literal = `(${vec.join(',')})`;
  return prisma.$queryRawUnsafe<{ id: string; aiText: string; distance: number }[]>(
    `
    SELECT id, "aiText", "embedding_vec" <=> $1::vector AS distance
    FROM "AdviceLog"
    WHERE "embedding_vec" IS NOT NULL
    ORDER BY "embedding_vec" <=> $1::vector
    LIMIT $2
  `,
    literal,
    k
  );
}
