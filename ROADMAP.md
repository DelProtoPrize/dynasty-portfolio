# Capability Roadmap & Scope Triage

The target capability set, triaged by how well the **available data** supports it.
The point of this triage: a sports-analytics panel rewards rigor and is skeptical
of finance buzzwords used loosely. Everything below is buildable — but some items
are flagship-strong and a couple need to be framed carefully or they read as gimmicks.

## A. Grounded with data we already have (MVP — build first)
These run off the current warehouse with SQL + light compute. Interview-ready.
- **League breakdown** — aggregates over dims/fact.
- **Roster distributions** — positional value allocation (`v_roster_assets`).
- **Roster valuations** — done (FantasyPros primary, FantasyCalc secondary).
- **Arbitrage delta (Buy/Sell)** — done (FP vs FC disagreement).
- **Percentile ranks** — `PERCENT_RANK() OVER (PARTITION BY league)`.
- **Concentration / "due diligence"** — HHI (`SUM(share^2)`, float-cast!).
- **Power rankings** — composite of roster value + recent points + wins.
- **Full team diagnostics** — a per-team panel composed of the above.
- **Trade calculator / trade abilities** — value-based trade evaluation (players + picks).
- **Acquisition diagnosis & potential targets** — positional-gap analysis vs league,
  then surface available/tradeable players who fill the gap.

## B. Grounded, but needs a small ETL addition (build second)
- **Player volatility & stability** — weekly per-player points exist in Sleeper
  matchup `players_points`; pull them → stdev / coefficient of variation, boom-bust rates.
- **Alpha** (manager skill) & **trade ROI** — wire the transactions fact (adds/drops/trades
  with timestamps) and value assets at the snapshot nearest each transaction.
- **Delta (Δ)** — value momentum = change in value over time. Needs accruing snapshots
  (and `fc_trend_30day` as a head start).
- **Gamma (Γ)** — acceleration of value change (2nd derivative). Needs several snapshots; noisy early.
- **Beta (β)** — sensitivity of a player's/roster's value moves to the market
  (league/position index): `cov(asset Δ, market Δ) / var(market Δ)`. Strong once history accrues.
- **Power rankings & team trajectory (short term)** — recent scoring trend + schedule.

## C. Advanced modeling — strong IF defined rigorously (build third, Python-side)
Keep the heavy math in Python (pandas/numpy), materialize outputs to tables, let
Node serve them. Plays to SQL+Python strengths instead of reimplementing math in JS.
- **DCF (flagship).** A player is an asset producing future "cash flows" = projected
  points/value over N seasons, discounted by a rate reflecting age, injury, and
  volatility risk, plus a terminal (decline) value. Dynasty value *is* the market's
  implicit DCF — so an explicit one yields a defensible intrinsic value vs. market price.
  This is the centerpiece of the "financial modeling" angle. Requires a projection input (below).
- **Team trajectory (long term)** — age-curve + young-asset value + pick capital → contend/rebuild window.
- **Risk models** — volatility, drawdown, VaR/CVaR on roster value or weekly points;
  a Sharpe-like return-per-unit-risk for players/rosters.

## D. Proceed with caution — framing risk
- **Offensive projection models** — meaningful projections need richer data than
  Sleeper/FP/FC provide (target share, snaps, EPA). **Recommended: add nflverse /
  `nfl_data_py`** (free, standard in NFL analytics) — feeds projections, volatility,
  and DCF at once. Worthwhile but a real data-source expansion.
- **LBO model.** Honest caveat: fantasy has no debt/leverage/interest, so a literal
  LBO doesn't map. A finance-literate panel may push back. Defensible *reframe*: a
  "win-now leverage ratio" = (future assets committed: picks/young players/FAAB) /
  (present value acquired), analyzing risk-adjusted return on win-now pushes. Use as
  a clearly-labeled analogy, not a literal LBO, or skip it.

## Recommended build order
1. **Repo + MVP (Bucket A)** on the Node/SQL/HTML spine — a working, demoable dashboard.
2. **ETL additions (Bucket B)** — players_points + transactions + accruing snapshots.
3. **Advanced models (Bucket C)** + nflverse integration; DCF as the showpiece.
4. **LBO/leverage** only if time allows, framed as analysis not a literal model.
