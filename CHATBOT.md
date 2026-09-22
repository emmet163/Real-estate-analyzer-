# Scout research assistant

## Run and connect AI

The chat panel is available from **Ask Scout** throughout the app; **Research** in the navigation opens a larger workspace. Existing discovery, calculator and watchlist screens remain available.

Run `npm ci`, `npm run db:generate`, and `npm run dev`. Copy `.env.example` to `.env`, then add `OPENAI_API_KEY` and `OPENAI_MODEL` on the server to enable live chat. Choose a model available to your account that supports the Responses API, streaming and function calling. Restart the server after changes. No browser-side key field is provided. No secrets use a `NEXT_PUBLIC_` variable. Without both settings, sending is disabled and a setup state explains why; clearly labeled **Research tools — no AI required** still support real searches and calculations against the available data. There is no fake-response mode in the running app.

The adapter uses the fixed `https://api.openai.com/v1/responses` endpoint with `store:false`, streaming, bounded function calls, and server-side schema checks. The model must call at least one tool on each turn. It receives recent conversation text, confirmed preferences and a bounded set of relevant property references. Structured result cards come from server tools, not model-generated JSON. The source follows the official [function-calling guide](https://developers.openai.com/api/docs/guides/function-calling) and [streaming guide](https://developers.openai.com/api/docs/guides/streaming-responses).

Messages, preferences, selected page context and relevant tool results are sent to the configured AI provider when live chat is used. The app does not send bank credentials, request mortgage documents, fetch user URLs, contact agents, submit offers or perform transactions. Never put API keys into chat messages. Local conversation files are not encrypted; protect the machine and storage backups appropriately. `store:false` is not a claim of zero provider retention; consult your provider/account data controls.

## Tools and system instructions

- `lib/research/instructions.ts`: complete system instructions, including grounding, synthetic labels, fairness, prompt-injection handling and no-transaction boundaries.
- `lib/research/tools.ts`: Zod tool schemas and exported JSON-schema `toolDefinitions` for the model.
- `lib/research/model.ts`: provider adapter, streamed event parser and bounded orchestration.
- `lib/research/search.ts`: hard constraints, authorized imports, property assessments and deterministic calculator integration.

| Tool | Behavior |
| --- | --- |
| `search_markets` | Reads the 24 synthetic city fixtures, enforcing confirmed state/city/distance filters and using the existing score. Aggregate market price is never treated as a property asking price. |
| `market_details` | Retrieves source, period, units, geography, gaps and score components. |
| `search_properties` | Reads licensed JSON imports and the current owner's saved manual analyses. Filters before ranking; returns up to six results. Requires a location preference first. |
| `property_details` | Returns known fields, explicit assumptions and missing inputs. No comparable data is fabricated. |
| `calculate_property` | Calls `lib/finance.ts` for base/offer/vacancy/management scenarios. Does not mutate the original property. |
| `compare_results` | Compares two to four stable references; rejects mixed property/market selections. |
| `propose_preferences` | Returns a proposed preference summary. The user must Apply before it changes search. |
| `request_save` | Returns a confirmation card only. A separate authenticated user action performs the save. |

Model functions are read-only. The server does not trust a model's claim that a save is authorized. Explicit UI Save actions are the write authority. Opening a result in the original calculator lets users save a changed scenario as a new analysis. A scenario card's Save refers to the underlying original record; scenario changes are labeled non-mutating.

## Budget, distance and financial assumptions

Available cash is compared with down payment + closing costs + rehab + an explicitly entered upfront cash reserve. It is never substituted for purchase price. The upfront cash reserve is distinct from the annual capital-expenditure reserve. If the cash constraint is set but reserve/cost inputs are missing, the property cannot satisfy it. Cash-on-cash uses the existing calculator's acquisition cash denominator (down payment + closing + rehab); the separate liquidity reserve is not invested capital in that metric.

Hard constraints include states, selected cities, type, min/max asking price, max rehab, available cash, minimum monthly cash flow and maximum straight-line distance. A distance limit is a city-center radius, **not driving distance or commute time**. Imported properties need coordinates to satisfy it; manual properties without coordinates are excluded from distance-constrained searches. Users can explicitly clear the constraint if desired. No widening occurs automatically. Risk preference and timeline are discussion context, not hidden ranking variables.

Financing/management preferences override those scenario inputs explicitly; otherwise supplied property inputs are used. Unknown numbers are not defaulted. A cash purchase sets debt to zero. One extra unit vacant for three months adds three unit-months / total annual unit-months to base vacancy, capped at 100%. The tool computes this and uses the original finance engine. It does not imply mortgage approval, appreciation or guaranteed results. Taxes, insurance, vacancy, maintenance, capex, management, utilities, HOA and financing remain visible in every complete scenario.

## Listing coverage and authorized import

**No live listing feed is bundled.** Without an import, search uses only the current owner's saved manual calculator analyses. They are labeled not-verified listings, with unknown availability/verification. Obvious demo/example analyses remain labeled synthetic. A saved manual analysis is still user-assumed even when no example words appear in its address; the app never upgrades it to verified data.

To connect an authorized snapshot, set `SCOUT_LISTINGS_FILE` to an absolute server-side file path and `SCOUT_LISTINGS_AUTHORIZED=true` only after confirming rights to use/display it. The file must be a JSON array matching `listingSchema` in `lib/research/types.ts`, at most 500 records and 2 MB. The import rejects synthetic/manual records, malformed values and duplicate IDs. Missing numeric financial fields may be omitted; the analyzer will explain missing critical inputs. Use real identifiers and data only from an authorized source, not a fabricated example feed.

Required record fields: `id`, `address`, `marketId` (supported city slug), `state`, `type`, `units`, `askingPrice` (number/null), `status`, `verifiedAt` (ISO/null), `source`, `sourceUrl`, `kind:"licensed"`, `rentKind`, `rentSource`, `lat` and `lng` (number/null), and `financials` (partial existing Property input object). Optional `description` is deliberately excluded from model context and returned cards. `financials` covers rent, taxes, insurance, financing, closing, rehabilitation, utilities, HOA, management, maintenance, capex, vacancy and other income. The listing's identity and asking price override duplicate financial fields. All supplied operating/financing amounts are displayed as scenario assumptions; use source metadata for their origin.

Only active licensed records verified within seven days and not future-dated qualify for search. Stale, pending, sold and unverified records are excluded. Bad configuration returns an error, not demo fallback. A contract-specific ingestion job must refresh the authorized snapshot; this MVP does not poll an external vendor. The existing provider architecture remains available for upstream integration. Real comparable sales/rental data and driving-time APIs are not connected.

## Local ownership and database migration

The app remains loopback-only. A random browser owner identity is signed by a server-held key and stored in an HttpOnly, SameSite=Strict cookie. Owner identity is never accepted from request JSON. Every conversation and watchlist query is scoped to the signed owner; IDs alone cannot access another owner's data. This is local browser ownership, **not a public multi-user login system**. Browsers sharing the same cookie share the same local owner. Keep the same host (`127.0.0.1`, rather than switching to `localhost`) and browser profile to retain that identity.

The first local session claims a copy of the legacy single-user watchlist once. The original file is preserved, but no unauthenticated route exposes it. New records use owner-specific files. Conversation files live in `data/conversations/`; `data/session-secret` signs cookies. Back up the data directory together with the secret. Clearing browser cookies creates a new owner; automatic account recovery is intentionally not provided. Public deployment would require authenticated users, secure HTTPS cookies, cross-process locks/rate limits and an account recovery design.

With PostgreSQL configured, run `npm run db:generate` and `npm run db:migrate` before launching. Migration `202609210002_research` adds owner scope to SavedResearch and creates ResearchConversation. Legacy database records are copied into the first local owner's scope. The filesystem marker/secret still must persist in PostgreSQL mode. A database failure is never a silent local-store fallback.

## Limits, cancellation and logging

Per local owner: 40 research mutations/minute, 8 AI messages/minute, 10 new conversations/minute. Up to 100 conversations, 100 messages per conversation, 60 property references, 6 search results, 4 comparisons, 8 tool calls and 4 model rounds per turn. Input messages are capped at 4,000 characters, HTTP bodies at 50 KB, recent model history at 10 messages, and model output at 2,400 tokens per round / 14,000 text characters per turn. Upstream streams are capped at 2 MB. Turns time out after 60 seconds; Stop aborts the provider request. Partial responses are stored as interrupted/failed. Retry is explicit, not automatic.

Limits and active-turn locks are in-process, appropriate to the existing single-process local deployment. Requests to change/clear/delete a busy conversation are rejected. Listing files are read-only and bounded; user-controlled URLs are never fetched, so SSRF through listing URLs is disabled by design. The model has no network or arbitrary SQL/file tools. App code does not log conversations, API keys or raw provider error bodies. Runtime access logs may show API paths/statuses.

## Verification

Run `npm test`, `npm run typecheck`, `npm run build`, and `npm exec -- prisma validate`. See CHATBOT-VERIFICATION.md for executed checks and credential-dependent limits. Live model tests require a configured key/model and may incur provider charges; this implementation does not spend against an unconfigured account or simulate a connected model.
