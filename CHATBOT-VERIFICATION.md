# Chatbot verification — September 21, 2026

## Automated checks
- npm test: 27 passed (12 existing + 15 research tests).
- npm run typecheck: passed.
- npm run build: production build passed, including research, session, watchlist and calculator routes.
- npm run db:generate and npm exec -- prisma validate: passed.

Research tests cover cash including reserves, state/city/radius restrictions, empty results without relaxed filters, missing inputs, stale/unavailable records, calculator-backed scenarios, stable ordinal references, demo labels, untrusted listing descriptions, tool schemas, owner isolation and tampered cookies, provider errors, rate limits, fragmented SSE, tool orchestration and cancellation, and invalid imports. Provider orchestration uses an injected test adapter; it is not a live AI test.

## Executed browser flow
Verified against the running local app at 127.0.0.1:3000:
1. Open Research; setup message and disabled AI send accurately reflect absent credentials.
2. Apply $75,000 total cash, $5,000 reserve, WI, duplex, maximum $250,000 purchase price, nonnegative cash flow.
3. Search initially returns no matching saved properties; out-of-state records are excluded without broadening preferences.
4. Create two explicitly synthetic Madison duplex analyses using the existing analyzer ($210,000 and $200,000 purchase prices).
5. Search returns labeled synthetic cards with $75,000 and $72,500 cash including reserve; projected cash flow $53 and $102/month.
6. Select two cards and compare: table matches card values and existing deterministic calculator.
7. Apply $15,000 offer reduction, three extra vacant unit-months and 10% management to P2: scenario purchase $195,000, cash including reserve $71,250, cash flow approximately -$158/month. Original record remains intact; save-original action is explicit.
8. Request Save and use the explicit Save P1 to watchlist button; success appears and watchlist refreshes.
9. Reload the page and select saved conversation: preferences, reference IDs, comparison, scenario and save messages persist.
10. Open compact Ask Scout panel from the property analyzer; current property context is displayed with an explicit context checkbox and Analyze current inputs action.

Desktop layout inspected visually. The test browser did not expose the attempted viewport resize API; mobile-specific CSS is implemented but a mobile viewport was not independently verified. QA records are clearly synthetic and remain in the local browser owner's data; they are excluded from the source archive.

## Integration limits
No AI credentials/model were configured, so live upstream streaming and model behavior were not exercised. Configure the environment per CHATBOT.md and repeat natural-language search and follow-ups with an authorized account. No listing feed is bundled; manual analyses and synthetic city markets are the only current evidence. Authorized listing imports require real licensed data and refresh/verification outside this app.

PostgreSQL was not available. Prisma generation, schema validation, and migration code are included, but executing the migration and database-backed persistence require a configured PostgreSQL instance. JSON persistence and owner isolation were tested. This remains a single-process loopback application, not a publicly deployable authentication system.
