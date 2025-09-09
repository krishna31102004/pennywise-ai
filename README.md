# Pennywise AI — Personal Finance Tracker with AI Insights

A production-ready starter for a modern fintech portfolio project. Connect a Plaid Sandbox bank, sync transactions and balances, categorize spend (rules + AI), compute KPIs, and ask natural-language questions about your money.

Built with **Next.js 15 (App Router)**, **TypeScript**, **Prisma**, **Postgres (Neon)**, **Plaid**, **Recharts**, and **Vercel**.

---

## ✨ Features

* **Plaid Sandbox link** (server-side token exchange, no secrets in the client)
* **Per-visitor sessions** (anonymous cookie) so every visitor gets their **own data**
* **Refresh job** to pull txns, recompute balances & KPIs, and log audits
* **Dashboards & charts**: cashflow, category spend, KPIs with deltas & sparklines
* **Budgets & rules** scaffolding (with “Apply rules” batch action)
* **AI**:

  * *Ask*: natural-language Q\&A over your transactions
  * *AI Insights*: auto-generated tips & KPI summaries
  * Optional **pgvector** nearest-neighbor helper for tip grounding
* **Unlink flow**:

  * **Soft unlink** hides data (keeps historical records)
  * **Hard delete** purges accounts, transactions, and joins in one transaction
* **DX niceties**: Prisma Studio, seed script (6 months), Prisma client singleton, structured logs

---

## 🗂 Project Structure

```
app/
  (routes)/...
  api/
    plaid/
      link-token/route.ts
      exchange/route.ts
      unlink/route.ts
  jobs/refresh/route.ts
components/
  charts/
  ui/
lib/
  prisma.ts
  insights.ts
  crypto.ts
  current-user.ts
prisma/
  schema.prisma
  migrations/
scripts/
  seed.ts
middleware.ts
```

---

## 🚀 Quick Start (Local)

**Prereqs**: Node 20+, pnpm 9+, a Neon Postgres database.

1. **Clone & install**

   ```bash
   pnpm i
   ```

2. **Configure env**
   Create `.env` from the example below and fill in real values (Plaid sandbox keys, Neon URLs, a 32-byte `ENCRYPTION_KEY`).

   ```bash
   # ---------- Database ----------
   DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require&pgbouncer=true&connect_timeout=10
   DIRECT_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require

   # ---------- Plaid (Sandbox) ----------
   PLAID_ENV=sandbox
   PLAID_CLIENT_ID=your_plaid_client_id
   PLAID_SECRET=your_plaid_sandbox_secret
   PLAID_PRODUCTS=transactions,balances
   PLAID_COUNTRY_CODES=US
   # Optional shared secret you add to your webhook url as ?secret=... (defense-in-depth)
   PLAID_WEBHOOK_SECRET=generate-a-strong-random-string

   # ---------- App ----------
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   # ---------- AI ----------
   OPENAI_API_KEY=sk-xxxx
   AI_AUTOCAT_ENABLED=true
   AI_INSIGHTS_ENABLED=true
   AI_ASK_ENABLED=true

   # ---------- Crypto (32 bytes; base64 or hex) ----------
   ENCRYPTION_KEY=replace-with-32-byte-secret
   ```

3. **Migrate & generate**

   ```bash
   pnpm prisma migrate deploy
   pnpm prisma generate
   ```

4. **Seed 6 months of demo data (optional per-user)**

   ```bash
   pnpm run seed
   ```

5. **Run**

   ```bash
   pnpm dev
   ```

   Open `http://localhost:3000`. On first visit you’ll see the **“Connect a bank (Sandbox)”** onboarding. Link a sandbox bank **or use the “Load sample data” button** on the dashboard to populate charts for your session.

---

## 🔄 Refresh Job

* **Route**: `GET /jobs/refresh`
* Pulls new Plaid transactions (if linked), recomputes KPIs/insights, and writes an `AuditLog`.
* Returns counts: `{ ok: true, refreshed: { txns, accounts, insights: {...} } }`.
* Never throws unhandled errors; falls back to local recompute if Plaid is missing.

---

## 🔐 Per-Visitor Sessions

* Middleware sets `pw_anid` (httpOnly) on the very first request.
* All reads/writes are **scoped by current user** resolved from that cookie.
* Race-safe user creation: `ensureUser()` uses a `find → create → P2002 retry` pattern.

---

## 🔗 Plaid Linking

* **Client** uses `react-plaid-link` to open the Link flow.
* **Server**

  * `POST /api/plaid/link-token` generates a link token with `client_user_id = current user`.
  * `POST /api/plaid/exchange` exchanges `public_token → access_token`, encrypts, and stores it.
* **Unlink**

  * `POST /api/plaid/unlink` supports:

    * **soft**: mark connection `revoked` (data hidden by default)
    * **hard**: delete TxnCategory → Transaction → Account → Connection in one transaction
  * UI reflects the change and revalidates caches immediately.

---

## 🤖 AI Features

* **Ask** page uses OpenAI to answer NL questions with structured calculations.
* **AI insights** periodically generate suggestions (severity-tagged).
* Flags in env:

  * `AI_AUTOCAT_ENABLED`
  * `AI_INSIGHTS_ENABLED`
  * `AI_ASK_ENABLED`

**Optional pgvector** (for ANN search to ground tips):

1. Enable the extension in your Postgres (Neon/managed PG supports `vector` in many plans).
2. Add a migration to `CREATE EXTENSION IF NOT EXISTS vector;` and vector indexes on your embedding columns.
3. The app automatically uses the ANN helper when `vector` is present; otherwise it falls back to simple retrieval.

---

## 🧰 Scripts

```bash
pnpm dev                   # start dev server
pnpm build                 # production build
pnpm start                 # run production build locally
pnpm prisma studio         # open Prisma Studio (CRUD UI)
pnpm prisma migrate dev    # create & apply a new migration
pnpm prisma migrate deploy # apply existing migrations (CI/Vercel)
pnpm run seed              # idempotent seed (6 months)
```

---

## ☁️ Deploy to Vercel

**Build & Output Settings**

* Install Command: `pnpm i --frozen-lockfile`
* Build Command: `pnpm prisma migrate deploy && pnpm build`
* Output: `.next`

**Environment Variables** (Preview + Production)

* `DATABASE_URL`, `DIRECT_URL`
* `PLAID_ENV=sandbox`, `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_PRODUCTS=transactions,balances`, `PLAID_COUNTRY_CODES=US`
* `NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>`
* `OPENAI_API_KEY`, AI flags
* `ENCRYPTION_KEY` (32 bytes)
* `PLAID_WEBHOOK_SECRET` (optional, if using webhooks)
* (Optional OAuth): `PLAID_REDIRECT_URI=https://<domain>/api/plaid/oauth-callback` and allow it in Plaid dashboard

**Runtime**

* Server routes (`/api/plaid/*`, `/jobs/refresh`) run in **Node** runtime.
  If you changed runtimes earlier, ensure `export const runtime = 'nodejs'`.

**First-visit sanity checks**

* Fresh browser ⇒ onboarding panel (no global data).
* Link sandbox ⇒ dashboard fills after refresh.
* Unlink:

  * soft → data hidden from totals by default
  * hard → accounts/txns deleted; charts update immediately

---

## 🔔 Optional: Webhooks (Auto-Refresh)

Webhooks are **not required** for the app to work, but they add auto-sync.

1. Add envs:

   ```
   NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>
   PLAID_WEBHOOK_SECRET=<strong random string>
   ```
2. In link-token creation (server), set:

   ```
   webhook = `${process.env.NEXT_PUBLIC_APP_URL}/api/plaid/webhook?secret=${process.env.PLAID_WEBHOOK_SECRET}`
   ```
3. Deploy and **re-link** a sandbox bank so the Item adopts the webhook.
4. Test from Plaid Dashboard → “Send test webhook (Transactions)”.
   Your app should accept the POST and trigger `/jobs/refresh` automatically.

---

## 🧪 Troubleshooting

* **500 on `/dashboard`** with `Unique constraint failed (anonId)`
  Ensure the per-visitor cookie middleware is present and all user creation goes through the `ensureUser()` helper (P2002 retry).
* **Plaid link-token fails**
  Missing `PLAID_*` envs or `NEXT_PUBLIC_APP_URL`. Add envs and redeploy.
* **Blank charts**
  Recharts needs explicit sizes. Charts are wrapped with fixed width/height to prevent 0×0 renders.
* **Data still visible after unlink**
  Verify the hard-delete path deletes `TxnCategory → Transaction → Account → Connection` in a single transaction and the queries are scoped to `status='active'`. Revalidation should run after unlink.

---

## 🔒 Security Notes

* `ENCRYPTION_KEY` is required to encrypt Plaid access tokens at rest.
* `PLAID_WEBHOOK_SECRET` is a shared secret you add to your webhook URL as `?secret=...` and verify in the route (defense-in-depth). Consider Plaid’s signature verification for production.
* Sensitive envs are never exposed to the client; only `NEXT_PUBLIC_*` is safe to expose.

---

## 🧱 Data Model (high level)

* `User` (anon or email)
* `Connection` (Plaid Item; status, institution, encrypted token)
* `Account` (type/subtype, balances, currency)
* `Transaction` (date, amount, merchant, accountId)
* `Category` & `TxnCategory` (many-to-many mapping)
* `Budget` & `BudgetEntry` (optional)
* `Rule` (categorization rules)
* `RecurringSeries` (subscriptions & recurring)
* `Insight` (KPI snapshots)
* `AdviceLog` (AI tips)

---

## 🧭 Roadmap (suggested next steps)

* Inline rule editor & category manager
* Budget CRUD + alerts
* OAuth-capable Plaid redirect support
* Multi-currency support
* More AI actions (forecast, bill negotiation suggestions)

---

## 📝 License

MIT — see [`LICENSE`](./LICENSE).
