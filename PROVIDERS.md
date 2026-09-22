# Real-data integration guide

The running UI is intentionally demo-only. Never connect a source by replacing failed real observations with fixtures. Each provider implements `Provider` from `lib/providers.ts`. `AuthorizedImport` supports already-authorized, normalized records for ACS, FHFA, regional reports, licensed feeds and manual input. `ingest(provider, geoId, 'real')` validates, caches and records failures. It rejects synthetic rows. `demo` rejects all non-synthetic rows.

## Observation contract

Required fields: key, numeric value or null, source name, source URL (nullable for synthetic/user input), exact reference period, retrieval ISO timestamp, geography description, stable geographic ID, units, kind (`observed`, `estimated`, `user-entered`, `synthetic`), and coverage/uncertainty note. Null means unavailable. Do not map missing or suppressed values to zero. Keep real Census geographic IDs separate from `demo:STATE:city` identifiers.

## Provider adapters to implement

1. ACS: use the Census API or authorized Census exports. Request place/county identifiers explicitly. Retain five-year window labels, estimates and margins of error, universe definitions and denominators. Do not infer annual change from overlapping five-year releases. Match metrics to the same geography and compatible period before scoring.
2. FHFA: import a published index series with its exact geographic scope, frequency, base and seasonal-adjustment definition. A price index is not median sale price; do not write it into the price field.
3. Regional housing reports: record report URL, table/page, publication date, reporting period, property-type coverage and geographic boundaries. Require authorized import rights.
4. Licensed listings/sales/rents: create a server-side adapter to the contracted endpoint. Store API keys in server environment variables; never prefix them NEXT_PUBLIC_. Follow license retention and display rules. Do not scrape restricted listing sites.
5. Manual: record user-entered provenance and coverage. User estimates must not become observed statistics.

No live endpoint is configured, and no paid feed is required. The source-specific transforms, licensing review, join checks and UI publication process need development. Do not claim real coverage until validated records are actually available.

## Cache and operational behavior

Default TTL is 24 hours. Disk cache keys include provider, geographic ID and real/demo mode. Cache files and JSONL import records are under `SCOUT_DATA_DIR/providers/`. Each provider serializes requests with at least a one-second interval. Adapter implementers must honor provider-specific quotas and Retry-After; raise an error on 429 rather than retrying aggressively. Add retries only with bounded backoff. Fetch adapters should set timeouts. Current import adapter performs no network requests.

Errors are logged with provider, geography, timestamp and message and then rethrown. Avoid including credential-bearing URLs in error messages. Successful imports record row count. Cache timestamps represent fetch time; observation timestamps and reference windows must remain intact. The Prisma `ImportRun` and `MarketMetric` tables provide integration storage but are not automatically populated by the disk import runner. Before exposing data, implement an explicit review/promotion step and extend tests for mixed geography, stale periods, missing values and provider failures.

Run real source work in a separate dataset. The front end currently imports `lib/demo.ts`; changing to production data requires a server-side data service with a clear mode label, and must not be a silent fallback.
