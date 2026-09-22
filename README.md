# Midwest Property Scout

A local, single-user rental research application for Wisconsin and Illinois. Built with Next.js App Router, TypeScript, Tailwind, Leaflet, Recharts, Zod and optional PostgreSQL/Prisma. **Demo — synthetic data.** The 24 city names and approximate coordinates are real; all financial and trend values are synthetic. No listing coverage or investment recommendations are claimed.

## Run locally

Requires Node.js 22.12+ (verified with Node 24) and npm. From this directory:

```sh
npm ci
npm run db:generate
npm run dev
```

Open http://127.0.0.1:3000. No API keys or database are necessary for demo mode. Background map tiles need internet. All financial inputs, tables, comparisons, and notes work without a data subscription. The application binds to loopback only. Do not expose it via a reverse proxy or public deployment: local mode has no authentication.

Copy `.env.example` to `.env` if changing storage configuration. With `DATABASE_URL` empty, watchlist records are atomically saved to `data/watchlist.json`. Back up that directory. This local adapter supports one application process; PostgreSQL is recommended for multiple processes. A configured database failure is an error, never a silent switch to JSON. Only one user is supported.

Production local run:

```sh
npm run build
npm start
```

## PostgreSQL option

Install PostgreSQL 15+ and create an empty database named `midwest_scout`. Set a local connection string in `.env` (never commit credentials):

```dotenv
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/midwest_scout
```

Then run:

```sh
npm run db:generate
npm run db:migrate
npm run db:seed
```

The committed SQL migration creates saved research, metric and import-run tables. The seed is idempotent and writes 192 explicitly synthetic metrics under `mode=demo`; it never deletes real data. The UI's deterministic fixture is `lib/demo.ts`, so a database is not needed to seed the visible demo. Prisma powers watchlist persistence when configured. Market imports are a separate integration layer, not yet connected to the demo UI. Existing JSON saves do not migrate automatically; back them up before switching storage.

## Product flow

Discover → select a market or View details → add markets to comparison → Compare → Property analyzer → Save analysis → Watchlist → Reopen analysis → Export CSV. Search supports town/county. Filters cover state, minimum/maximum price, yield, vacancy, opportunity score and confidence. Sorting is reversible. Compare up to four places. Browser back navigation and view links are supported via URL query parameters.

The analyzer supports 1–4 units, cash purchases, zero-interest loans, financing, itemized costs, capital reserves, independent editable scenarios, and rent/price sensitivity charts. Outputs use annual dollars except explicitly labeled monthly payment/cash flow. Base inputs and scenario assumptions are saved together. CSV exports base property inputs and results; it does not export scenario tables.

## Methodology

See the in-app **Data & methodology** page and [METHODOLOGY.md](METHODOLOGY.md). Scoring, finance, providers, persistence and UI live in separate modules. Opportunity weights are configurable in `lib/scoring.ts` and validated to total 100. No AI scoring or claims of undervaluation are used. No history is invented where none exists.

## Real data setup

See [PROVIDERS.md](PROVIDERS.md). `lib/providers.ts` supplies a typed provider interface, validated authorized-import adapter, cache, per-provider request spacing and success/failure log. Real live-source adapters, geography reconciliation and a UI to review/publish validated imports are future integration work. The app intentionally cannot toggle to fictional “live” data.

## Verification

```sh
npm test
npm run typecheck
npm run build
```

Tests cover amortization, cash/zero-interest loans, exact income/expense reconciliation, missing values, undefined ratios, scenarios, normalization, weights, insufficient coverage, real/demo separation, CSV labeling and formula escaping, and concurrent durable local saves. See `VERIFICATION.md` for the executed browser checks and environment limitations.

## Architecture and limitations

- `components/`: interactive research UI; map loads client-side.
- `app/api/`: Zod-validated calculation/export and saved research APIs. Same-origin mutation check and local-host guard. API credentials never enter client code.
- `lib/finance.ts`: pure finance functions; no appreciation included in operating returns.
- `lib/scoring.ts`: transparent normalization, peers and missing-value policy.
- `lib/demo.ts`: synthetic fixtures kept separate from real provider records.
- `lib/store.ts`: local JSON and optional Prisma adapters.
- `prisma/`: schema, SQL migration; `scripts/seed.mjs`: reproducible demo seed.
- No live listings, neighborhood rankings, historical price/rent series, public-account login, email alerts or subscriptions. Only 24 demo cities.
- County labels are geographic context, not county statistics. Some cities cross county lines; the single county label identifies principal county context, not full boundary coverage.
- OSM/CARTO map attribution is displayed. User-entered assumptions and synthetic defaults are identified in exports.
- No third-party analytics or telemetry is implemented in app code. Next.js may emit its standard development telemetry notice.

## Scout research chatbot

The Research workspace and Ask Scout panel provide saved conversations, explicit preferences, constrained property search, comparisons, and calculator-backed scenarios. AI replies use the server-side OpenAI Responses API. Set `OPENAI_API_KEY` and `OPENAI_MODEL` to enable them. Without credentials the UI offers labeled non-AI tools. Browser-owner sessions isolate saved research; this remains a loopback-only local app.

See [CHATBOT.md](CHATBOT.md) for configuration, authorized listing imports, architecture, privacy, migrations, and limitations, and [CHATBOT-VERIFICATION.md](CHATBOT-VERIFICATION.md) for executed checks.
