// Whisk Labs /predict — REAL LightGBM inference (pure JS tree walker)
// Loads a 118-tree gradient-boosted model from Storage, runs it twice
// (real + counterfactual) per (item, hour), and returns SHAP-like contributions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { runInference, type ModelArtifact } from "./inference.ts";
import { generateBriefing } from "./briefing.ts";
import { fetchWeather, isHoliday } from "./weather.ts";
import { buildActiveSignals } from "./signals.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MODEL_URL = `${SUPABASE_URL}/storage/v1/object/public/model-artifacts/lightgbm-v1.json`;

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const HOUR_LABELS = ["7a","8a","9a","10a","11a","12p","1p","2p","3p","4p","5p","6p","7p"];

// Shift definitions — must mirror src/lib/shifts.ts
const SHIFTS: Record<string, { hours: number[]; display: string; short: string }> = {
  breakfast: { hours: [7, 8, 9, 10],   display: "7:00 AM – 11:00 AM", short: "7-11a" },
  lunch:     { hours: [11, 12, 13],    display: "11:00 AM – 2:00 PM", short: "11a-2p" },
  afternoon: { hours: [14, 15, 16],    display: "2:00 PM – 5:00 PM",  short: "2-5p" },
  dinner:    { hours: [17, 18, 19],    display: "5:00 PM – 8:00 PM",  short: "5-8p" },
};

// Cache the model in module memory (warm starts skip the fetch)
let modelCache: ModelArtifact | null = null;
async function loadModel(): Promise<ModelArtifact> {
  if (modelCache) return modelCache;
  const r = await fetch(MODEL_URL);
  if (!r.ok) throw new Error(`model fetch failed ${r.status}`);
  modelCache = await r.json() as ModelArtifact;
  console.log(`model loaded: ${modelCache.version} ${modelCache.n_trees} trees`);
  return modelCache;
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const locationId: string = body.location_id ?? "11111111-1111-1111-1111-111111111111";
    const shiftDate: string = body.date ?? "2026-04-20";
    const shiftId: string = body.shift ?? "lunch";
    const shiftDef = SHIFTS[shiftId] ?? SHIFTS.lunch;
    const SHIFT_HOURS = shiftDef.hours;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const [{ data: location }, { data: menu }, { data: events }, { data: inventoryLevels }, model] = await Promise.all([
      supabase.from("locations").select("*").eq("id", locationId).single(),
      supabase.from("menu_items").select("*").eq("location_id", locationId),
      supabase.from("events").select("*").eq("event_date", shiftDate),
      supabase.from("inventory_levels").select("*"),
      loadModel(),
    ]);
    const stockByItem: Record<string, { stock: number; par: number; unit: string; lastCounted: string }> = {};
    for (const inv of (inventoryLevels ?? []) as any[]) {
      stockByItem[inv.menu_item_id] = {
        stock: Number(inv.current_stock),
        par: Number(inv.par_level),
        unit: inv.unit,
        lastCounted: inv.last_counted_at,
      };
    }

    if (!location) {
      return new Response(JSON.stringify({ error: "location not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find nearest active event
    let activeEvent: any = null;
    let activeDistance = 9.99;
    for (const ev of events ?? []) {
      if (ev.lat == null || ev.lng == null) continue;
      const d = distanceKm(location.lat, location.lng, ev.lat, ev.lng);
      if (d <= Number(ev.radius_km) && d < activeDistance) {
        activeEvent = ev; activeDistance = d;
      }
    }

    // Day of week (0=Mon)
    const dow = (new Date(shiftDate + "T12:00:00Z").getUTCDay() + 6) % 7;

    // Build category -> model item indices map
    const catToIdxs: Record<string, number[]> = {};
    for (const it of model.items) {
      (catToIdxs[it.category] ??= []).push(it.idx);
    }
    const catIndex: Record<string, number> = {};
    model.categories.forEach((c, i) => catIndex[c] = i);

    // Run inference for every (menu_item, hour)
    type Cell = { predicted: number; baseline: number; shap: Record<string, number> };
    const grid: Record<string, Cell[]> = {}; // menu_item.id -> [12 hours]

    const eventCtx = activeEvent
      ? {
          dist_km: Number(activeDistance.toFixed(2)),
          // Clamp to training range (synthetic data was 8k-25k attendance)
          attend: Math.min(25000, Number(activeEvent.expected_attendance ?? 15000)),
        }
      : { dist_km: 9.99, attend: 0 };

    // Real weather from Open-Meteo (free, no API key) — varies per date & hour
    const weatherDay = await fetchWeather(location.lat, location.lng, shiftDate, HOURS);
    const holiday = isHoliday(shiftDate);
    // Day-of-week multiplier on lag features: weekends + holidays run hotter,
    // Mondays run cooler. Gives the model date-varying lag inputs even without
    // a sales history table.
    const dowMult = holiday ? 1.25 : ([0.85, 1.0, 1.05, 1.05, 1.1, 1.2, 1.15][dow] ?? 1.0);

    for (const m of menu ?? []) {
      const cat = m.category as string;
      const modelIdxs = catToIdxs[cat] ?? [0];
      const base = Number(m.baseline_hourly_demand);
      const cells: Cell[] = [];
      for (let i = 0; i < HOURS.length; i++) {
        const hour = HOURS[i];
        const w = weatherDay.byHour[hour] ?? { temp_f: 58, precip: 0, clear: 1, cloud_pct: 10 };
        // Hour-shape: bell curve peaking at lunchtime (matches training synth).
        const hourShape = Math.exp(-Math.pow(hour - 12.5, 2) / 8) + 0.25;
        // Lag features: scaled by dow + slight jitter from precip (rainy day → lower lag)
        const precipDamp = Math.max(0.7, 1 - w.precip * 0.15);
        const lag1d = base * hourShape * dowMult * precipDamp;
        const lag7d = base * hourShape * dowMult;            // last week, no weather
        const lag28d = base * hourShape;                     // 4-wk avg, neutral
        let predSum = 0, baseSum = 0;
        const shapAgg: Record<string, number> = {};
        for (const idx of modelIdxs) {
          const featReal = [
            hour, dow, idx, catIndex[cat] ?? 0,
            w.temp_f, w.precip, w.clear,
            eventCtx.dist_km, eventCtx.attend,
            lag7d, lag28d, lag1d,
          ];
          const featBase = [...featReal];
          featBase[7] = 9.99; // event_dist_km
          featBase[8] = 0;    // event_attend

          const real = runInference(model, featReal, true);
          const baseline = runInference(model, featBase, false);
          predSum += real.value;
          baseSum += baseline.value;
          for (const [k, v] of Object.entries(real.contributions)) {
            shapAgg[k] = (shapAgg[k] ?? 0) + v;
          }
        }
        const n = modelIdxs.length;
        // Scale: model trained on synthetic items with their own bases — rescale to this item's baseline
        const calibration = base / 14; // model items avg base ~14
        cells.push({
          predicted: Math.max(0, predSum / n) * calibration,
          baseline:  Math.max(0, baseSum / n) * calibration,
          shap: Object.fromEntries(Object.entries(shapAgg).map(([k, v]) => [k, v / n * calibration])),
        });
      }
      grid[m.id] = cells;
    }

    // Aggregate hourly demand series (sum across menu) — single forecast line
    const demandSeries = HOURS.map((_h, i) => {
      let predicted = 0;
      for (const m of menu ?? []) {
        predicted += grid[m.id][i].predicted;
      }
      return { hour: HOUR_LABELS[i], predicted: Math.round(predicted) };
    });

    // Per-item prep recommendations for the 11a-2p shift.
    // Status & note now driven by absolute volume vs. that item's typical baseline_hourly_demand,
    // not by event-uplift attribution.
    const shiftIdxs = SHIFT_HOURS.map(h => HOURS.indexOf(h));
    const prepItems = (menu ?? []).map((m: any) => {
      const cells = grid[m.id];
      const pred = shiftIdxs.reduce((s, i) => s + cells[i].predicted, 0);
      const units = Math.round(pred);
      const typical = Number(m.baseline_hourly_demand) * SHIFT_HOURS.length;
      const ratio = units / Math.max(1, typical);
      let status: "critical" | "high" | "low" = "high";
      if (ratio >= 1.6) status = "critical";
      else if (ratio < 0.7) status = "low";
      const note =
        ratio >= 1.6 ? "Heavy volume — prep extra"
        : ratio < 0.7 ? "Slow shift — trim prep"
        : "Healthy steady demand";
      return { id: m.id, name: m.name, units, ratio: Number(ratio.toFixed(2)), status, note };
    });

    // Inventory recs — driven by REAL stock from inventory_levels table
    const inventory = (menu ?? []).map((m: any) => {
      const cells = grid[m.id];
      const demand = Math.round(shiftIdxs.reduce((s, i) => s + cells[i].predicted, 0));
      const inv = stockByItem[m.id];
      // Fallback if no inventory row exists yet for this item
      const stock = inv ? Math.round(inv.stock) : Math.round(Number(m.baseline_hourly_demand) * 2);
      const par   = inv ? Math.round(inv.par)   : Math.round(Number(m.baseline_hourly_demand) * 6);
      const unit  = inv?.unit ?? "units";
      // Order to bring stock back to par AFTER covering predicted demand
      const projected = stock - demand;
      const order = projected < par ? Math.ceil((par - projected) / 10) * 10 : 0;
      // Risk: high if we'll run out before the shift ends
      const risk: "low" | "high" = stock < demand ? "high" : "low";
      return {
        item: m.name,
        stock,
        par,
        unit,
        demand,
        order,
        risk,
        lastCounted: inv?.lastCounted ?? null,
      };
    });

    // Real SHAP: aggregate across all (item, shift-hour) cells, then convert
    // to percent contribution to the uplift over baseline.
    const shapTotals: Record<string, number> = {};
    let totalShapAbs = 0;
    for (const m of menu ?? []) {
      for (const i of shiftIdxs) {
        for (const [k, v] of Object.entries(grid[m.id][i].shap)) {
          shapTotals[k] = (shapTotals[k] ?? 0) + v;
          totalShapAbs += Math.abs(v);
        }
      }
    }
    const labelMap: Record<string, string> = {
      event_dist_km: activeEvent ? activeEvent.name : "Event Proximity",
      event_attend:  activeEvent ? `${activeEvent.name} Crowd` : "Crowd Size",
      hour: "Time of Day",
      dow: "Day of Week",
      temp_f: "Temperature",
      precip: "Precipitation",
      clear: "Sky Conditions",
      lag_7d: "Last Week (Same Hour)",
      lag_28d: "4-Week Average",
      lag_1d: "Yesterday Same Hour",
      item_idx: "Item Mix",
      cat_idx: "Category Mix",
    };
    const ranked = Object.entries(shapTotals)
      .map(([key, v]) => ({
        key,
        feature: labelMap[key] ?? key,
        // Signed pct of total absolute impact — preserves direction.
        contribution: Math.round((v / Math.max(1, totalShapAbs)) * 100),
      }))
      .filter(f => f.contribution !== 0)
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 6);

    const featureContribution = ranked.map(({ feature, contribution }) => ({ feature, contribution }));

    const activeSignals = buildActiveSignals(
      ranked.map(({ key, contribution }) => ({ key, contribution })),
      {
        weather: {
          tempF: weatherDay.summary.tempF,
          condition: weatherDay.summary.condition,
          precip: Object.values(weatherDay.byHour).reduce((s, w) => s + w.precip, 0) / Math.max(1, Object.keys(weatherDay.byHour).length),
        },
        event: {
          name: activeEvent?.name ?? "",
          distanceKm: activeEvent ? Number(activeDistance.toFixed(2)) : 0,
          attendance: activeEvent ? Number(activeEvent.expected_attendance ?? 0) : 0,
          active: !!activeEvent,
        },
        dow,
        holiday,
        isoDate: shiftDate,
      },
    );

    // Net impact: sum of all signed contributions (capped to plausible range)
    const netImpact = Math.max(-100, Math.min(100,
      activeSignals.reduce((s, sig) => s + sig.contribution, 0)
    ));

    const predictedTotal = demandSeries.reduce((s, d) => s + d.predicted, 0);
    const peakHour = demandSeries.reduce((p, d) => d.predicted > p.predicted ? d : p, demandSeries[0]);
    const sortedByVolume = [...prepItems].sort((a, b) => b.units - a.units);

    const aiBriefing = await generateBriefing({
      event: activeEvent ? { name: activeEvent.name, distance_km: Number(activeDistance.toFixed(2)) } : null,
      location: location.name,
      day: shiftDate,
      top_prep: sortedByVolume[0],
      cut_prep: sortedByVolume[sortedByVolume.length - 1],
    });

    const payload = {
      scenario: {
        date: shiftDate,
        location: location.address,
        shift: shiftDef.display,
        signals: {
          event: activeEvent
            ? { name: activeEvent.name, status: "Active", distanceKm: Number(activeDistance.toFixed(2)) }
            : { name: "None", status: "Inactive", distanceKm: 0 },
          weather: weatherDay.summary,
          academic: { status: holiday ? "Holiday" : "Semester Active" },
        },
      },
      demandSeries,
      prepItems,
      inventory,
      featureContribution,
      activeSignals,
      savings: {
        // Hardcoded demo numbers
        wastePreventedWeek: 420,
        projectedMonthly:   1820,
        co2OffsetKg:        95,
      },
      aiBriefing,
      meta: {
        predictedTotal,
        peakHour: peakHour?.hour ?? null,
        peakOrders: peakHour?.predicted ?? 0,
        eventActive: !!activeEvent,
        netImpactPct: netImpact,
        liftCount: activeSignals.filter(s => s.direction === "up").length,
        dragCount: activeSignals.filter(s => s.direction === "down").length,
        model: {
          version: model.version,
          trees: model.n_trees,
          trainedAt: model.trained_at,
          valMape: model.metrics?.val_mape_pct,
        },
      },
    };

    // Best-effort cache
    supabase.from("predictions").insert({
      location_id: locationId, shift_date: shiftDate, shift_label: shiftDef.short, payload,
    }).then(({ error }) => { if (error) console.error("cache insert failed", error); });

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("predict error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
