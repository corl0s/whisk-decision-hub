
The user is asking what's needed to turn this Whisk Labs demo (currently mock data only) into a fully functioning product — both the **ML model** and the **backend**. This is a research/planning question, not an immediate build request. I'll lay out a clear, scoped plan for what each layer would need.

Current state: All data lives in `src/lib/whiskData.ts` as static mocks. No backend, no auth, no model. The UI already mirrors a `/predict` API schema, so the contract is half-defined.

I'll structure the answer in 3 parts: (1) Backend, (2) ML model, (3) Phased build plan inside Lovable.

---

# Plan: Make Whisk Labs Fully Functioning

## 1. Backend (Lovable Cloud + Edge Functions)

Lovable Cloud gives you Postgres + Auth + Edge Functions out of the box — no external account needed. Everything below runs there.

**Database tables**
- `locations` — restaurants (id, name, address, lat/lng, timezone)
- `menu_items` — SKUs with category, prep time, shelf life
- `inventory` — current stock per location/item, updated by POS sync
- `orders` — historical order log (location_id, item_id, qty, timestamp, channel)
- `events` — external signals (marathons, games, weather, academic calendar) with date, lat/lng, radius
- `predictions` — cached model outputs per location/shift (hourly demand, prep recommendations, feature contributions)
- `purchase_orders` — generated POs, status, supplier, line items
- `user_roles` — `kitchen_staff` | `manager` | `admin` (separate table, RLS-enforced)

**Edge functions**
- `POST /predict` — takes `{location_id, date, shift}`, returns the same schema the UI already consumes (demandSeries, prepItems, inventory recs, featureContribution, aiBriefing)
- `POST /ingest-orders` — webhook for POS systems (Toast, Square) to stream live order data
- `GET /signals` — aggregates weather (OpenWeather), events (Ticketmaster/PredictHQ), academic calendars
- `POST /generate-po` — turns inventory recommendations into a purchase order, optionally emails supplier (Resend connector)
- `POST /chef-briefing` — calls Lovable AI Gateway (Gemini) with prediction context to generate the natural-language briefing

**Auth & RLS**
- Email/password auth via Lovable Cloud
- RLS policies so kitchen staff see only their location, managers see their org's locations
- Roles in a separate `user_roles` table with a `has_role()` security-definer function

**External integrations needed**
- POS integration (Toast / Square / Clover API) for live orders + inventory
- Weather API (OpenWeather, free tier fine)
- Events API (PredictHQ is the gold standard; Ticketmaster + manual entry as fallback)
- Email (Resend connector) for purchase orders
- AI briefing (Lovable AI Gateway — already available, no key needed)

---

## 2. ML Model

You don't need a giant model on day one. A staged approach:

**Phase A — Heuristic baseline (week 1, ships immediately)**
- Compute baseline demand per (item, hour, day-of-week) from 4–8 weeks of order history
- Apply rule-based uplifts: marathon within 1km → +150% hydration, +35% bowls, −60% delivery items; clear weather → +8%; etc.
- Surfaces value immediately, no training infrastructure required
- Runs entirely inside the `/predict` edge function

**Phase B — Gradient-boosted model (weeks 2–6)**
- **Algorithm**: LightGBM or XGBoost regression, one model per item-category (or a single multi-output model)
- **Target**: hourly order count per item per location
- **Features**:
  - Temporal: hour, day-of-week, week-of-year, holiday flags
  - Weather: temp, precipitation, condition
  - Events: distance to nearest event, event size, event type, time-to-event
  - Location: lat/lng, foot-traffic index, neighborhood type
  - Lag features: same hour last week, rolling 7/28-day averages
  - Academic: in-session flag, exam-week flag
- **Training data needed**: ~6 months of order history per location to start, ideally 12+
- **Feature contribution** (the sidebar chart): SHAP values from the trained model — gives you the "Marathon Event +32%" breakdown for free
- **Hosting**: Train offline (Python/Colab), export to ONNX, run inference inside the edge function via `onnxruntime-web`. Or host on a small Modal/Replicate endpoint and call from the edge function.

**Phase C — Per-location fine-tuning (months 3+)**
- Hierarchical model: global base + per-location residuals
- Online learning: nightly retrain with the previous day's actuals
- Confidence intervals + "model uncertainty" badge in the UI

**Evaluation**
- MAPE (mean absolute percent error) per item-category, target <20% for top items
- A/B test: model recommendations vs. manager intuition, measure waste $ delta — this becomes the "Waste Prevented" metric in the Manager view, computed for real instead of mocked.

---

## 3. Suggested Build Order in Lovable

A pragmatic 4-step sequence — each step is independently shippable.

```text
Step 1  Enable Lovable Cloud + auth
        Create tables, seed with current mock data, wire UI to live queries
Step 2  Build /predict edge function with the Phase A heuristic
        Replace whiskData.ts imports with fetch calls
Step 3  Add POS ingest webhook + weather/events signal fetcher
        Real data starts flowing in
Step 4  Train Phase B model offline, deploy as ONNX inside /predict
        Add SHAP-based feature contributions, real Chef's Briefing via Lovable AI
```

After Step 1 you already have a real multi-tenant SaaS. After Step 2 the demo is "live" with rule-based intelligence. Steps 3–4 are where the actual ML differentiation kicks in.

---

## What I need from you to start

Pick where to begin and I'll switch out of plan mode and build it:

1. **Step 1 only** — stand up Lovable Cloud, schema, auth, and migrate the UI off mock data
2. **Steps 1 + 2** — add the heuristic `/predict` function and live Chef's Briefing via Lovable AI
3. **Full backend scaffold (Steps 1–3)** — including stubbed POS webhook and weather/events fetchers, ready for real keys
4. **Something else** — tell me which slice matters most for your hackathon demo

Most teams in your spot get the biggest judging payoff from option **2** — it makes the demo provably real (live AI briefing, persisted data, auth) without waiting on POS integrations or model training.
