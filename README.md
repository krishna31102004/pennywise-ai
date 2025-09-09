# Personal Finance Tracker — v4.4

Fixes:
- react-plaid-link@4.1.1 (no scoped package).
- /jobs/refresh is dev-safe and returns counts even without Plaid.
- Seed is idempotent and handles root categories without composite-upsert on null.
- Prisma client singleton.

See `app/jobs/refresh/route.ts` and `scripts/seed.ts`.