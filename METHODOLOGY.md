# Financial and scoring methodology

## Finance

All amounts are USD. Monthly inputs: rent per unit, other income, owner-paid utilities and HOA. Annual inputs: taxes and insurance. Rates are percentages, not fractions. Down payment is a percentage of purchase price. Initial rehab and closing are cash costs, not financed. Property type fixes unit count to one through four. Blank numeric inputs fail validation instead of becoming zero.

Scheduled rent = monthly rent × units × 12. Effective income = scheduled rent × (1 − vacancy) + other income × 12. Other income is assumed fully collected. Management and maintenance use effective income. Operating expenses include taxes, insurance, utilities, HOA, management and maintenance. NOI = effective income − operating expenses. NOI excludes debt, depreciation, income taxes and capex.

Loan principal = price × (1 − down payment). Monthly amortization uses P×r/(1−(1+r)^−n), where r = annual rate/12 and n = years×12. Zero-interest payment is principal/n; cash purchases have zero debt service. Capital reserve = scheduled annual rent × capex percentage. Spendable cash flow = NOI − annual debt service − capital reserve. Initial cash = down payment + closing + rehab.

Cap rate = NOI/price. Cash-on-cash = spendable cash flow/initial cash. DSCR = NOI/debt service. A nonpositive denominator returns null, displayed as Undefined or N/A. Negative numerators remain negative. Break-even occupancy = (fixed costs + debt service + capex reserve − other income×(1−variable cost fraction)) / (scheduled rent×(1−variable cost fraction)). Occupancy can exceed 100% or be negative; it is not silently clamped. No appreciation, selling costs, tax benefits, or refinancing proceeds are included.

Scenarios independently change rent, vacancy, operating costs/capex and rehab; they do not edit the base inputs. Expense changes scale fixed costs and percentage-based management, maintenance and reserve rates (each rate capped at 100%). Sensitivity charts vary only rent or price. Price sensitivity holds down-payment percentage and the entered tax bill fixed; reassessed taxes must be tested separately.

## Score

Linear min/max normalization, clipped to [0,100]. Reverse direction for costs and vacancy. Weights: gross yield proxy 35%; relative yield vs same-state, same-demo-size peers 20%; demand 20%; vacancy 15%; tax burden 10%. Peer mean requires two other available observations. Gross yield bounds 3–12%. Peer yield difference bounds −3 to +3 percentage points. Demand averages normalized population (−2 to 3%) and employment (−2 to 4%). Vacancy bounds 3–12%, tax bounds 1–3.5%.

Missing components contribute no weight, never zero values. Available weighted coverage must be at least 75% and rental economics and demand must both exist. Otherwise score is null. Available weights are renormalized to 100. Liquidity and non-tax costs are not supported and are explicitly omitted. This limited cost proxy is a material model limitation. Thresholds and size classes are illustrative, not empirically fitted.

Confidence is independent: mean of eight completeness/freshness contributions, each missing = 0, otherwise max(0,1−age in days/1095). Demo reference date is 2026-09-21. High ≥80; moderate ≥60; otherwise low. This demonstrates missing and stale-data treatment, not evidentiary quality. Real providers must add period age, survey uncertainty, quality and cross-boundary checks.

This initial screening model has not been validated as a predictor of future returns. It does not establish fair value or identify “undervalued” properties. Aggregate rent/price ratios are not verified property returns.
