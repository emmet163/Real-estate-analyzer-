# Verification report

Verified September 21, 2026 on Windows with Node 24.21.0.

## Passed

- `npm test`: 12 tests passed. Includes known amortization result, zero-interest/cash purchases, independent operating-statement reconciliation, undefined ratios, missing inputs, scenario transformations, score normalization/weights/coverage, synthetic/real separation, CSV formula protection, concurrent local persistence, median calculation, and local request-origin validation.
- `npm run typecheck`: passed.
- `npm run build`: passed; Next.js 16.3.5 production build generates the app and both API routes.
- `npm run db:generate`: passed with Prisma 7.10.0.
- `prisma validate`: passed.
- Dependency installation audit and production audit: zero known vulnerabilities after pinned transitive overrides for deepmerge-ts and mysql2. Overrides are recorded in package.json and package-lock.json.
- Development and production servers started successfully on 127.0.0.1:3000.
- Browser workflow: Discover → market detail → add markets → comparison → property analyzer → save → watchlist → reopen → CSV export action. Two markets displayed side by side; saved property notes reopened correctly.
- Stopped the development server, launched the production server, reloaded, and reopened the saved market/property records and notes from disk.
- Browser cash-purchase state displayed zero debt and N/A debt coverage; blank rent input displayed validation instead of outputs. Export/save are disabled for invalid inputs.
- Empty search displayed a useful empty state and reset restored results.
- Visual checks at desktop and 390px mobile widths; no document-level horizontal overflow at mobile width. Wide tables scroll within their panels. Map tiles loaded with attribution.
- CSV endpoint returned HTTP 200 and text/csv with labeled assumptions, units and calculated results. The browser export action displayed success. The browser automation download-event hook timed out, so completion of a native download on the host filesystem was not independently confirmed.

## Environment limits and future work

- PostgreSQL migration execution and seed execution were not run: this environment has no PostgreSQL server, psql, Docker executable, or configured database credentials. Prisma generation/schema validation passed; PostgreSQL persistence still needs an integration test against a running server.
- The original tsx runner failed before executing tests because Windows sandbox account lookup returned `uv_os_get_passwd ENOMEM`. The delivered test command compiles tests with TypeScript then uses Node's built-in test runner; this command passed.
- Browser automation is exercised interactively, not shipped as a standalone Playwright suite. Repeat the documented workflow after future UI changes.
- Real provider API adapters and UI integration are not complete; the implemented provider contract/import/cache layer and setup guide are the extension path. No live observations are shown.
- No historical series or verified listing coverage; these gaps are shown explicitly. No authentication or public deployment. Local mode only.

## Files and demo saves

`data/` is runtime state and excluded from the source archive. A clearly named smoke-test property and saved Rockford demo market may remain in the working checkout as examples. The ZIP starts with an empty watchlist. The ZIP excludes node_modules, generated build/test output, caches and private runtime state.
