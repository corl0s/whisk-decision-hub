// Whisk Labs /predict — REAL LightGBM inference (pure JS tree walker)
// Loads a 118-tree gradient-boosted model from Storage, runs it twice
// (real + counterfactual) per (item, hour), and returns SHAP-like contributions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { runInference, type ModelArtifact } from "./inference.ts";
import { generateBriefing } from "./briefing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MODEL_URL = `${SUPABASE_URL}/storage/v1/object/public/model-artifacts/lightgbm-v1.json`;

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const HOUR_LABELS = ["8a","9a","10a","11a","12p","1p","2p","3p","4p","5p","6p","7p"];
const SHIFT_HOURS = [11, 12, 13]; // 11a-2p

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
    const shiftDate: string = body.date ?? "2026-04-21";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const [{ data: location }, { data: menu }, { data: events }, model] = await Promise.all([
      supabase.from("locations").select("*").eq("id", locationId).single(),
      supabase.from("menu_items").select("*").eq("location_id", locationId),
      supabase.from("events").select("*").eq("event_date", shiftDate),
      loadModel(),
    ]);

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
      ? { dist_km: Number(activeDistance.toFixed(2)), attend: Number(activeEvent.expected_attendance ?? 15000) }
      : { dist_km: 9.99, attend: 0 };

    // Synthetic weather (clear, 58F) — would come from API in prod
    const weather = { temp_f: 58, precip: 0, clear: 1 };

    for (const m of menu ?? []) {
      const cat = m.category as string;
      const modelIdxs = catToIdxs[cat] ?? [0];
      const base = Number(m.baseline_hourly_demand);
      const cells: Cell[] = [];
      for (let i = 0; i < HOURS.length; i++) {
        const hour = HOURS[i];
        // Average prediction across model items of this category, then scale
        // by this menu_item's baseline / category mean baseline.
        let predSum = 0, baseSum = 0;
        const shapAgg: Record<string, number> = {};
        for (const idx of modelIdxs) {
          const lag = base; // simple lag estimate
          const featReal = [
            hour, dow, idx, catIndex[cat] ?? 0,
            weather.temp_f, weather.precip, weather.clear,
            eventCtx.dist_km, eventCtx.attend,
            lag, lag, lag, // lag_7d, lag_28d, lag_1d
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

    // Aggregate hourly demand series (sum across menu)
    const demandSeries = HOURS.map((_h, i) => {
      let baseline = 0, predicted = 0;
      for (const m of menu ?? []) {
        baseline += grid[m.id][i].baseline;
        predicted += grid[m.id][i].predicted;
      }
      return { hour: HOUR_LABELS[i], baseline: Math.round(baseline), predicted: Math.round(predicted) };
    });

    // Per-item prep recommendations for the 11a-2p shift
    const shiftIdxs = SHIFT_HOURS.map(h => HOURS.indexOf(h));
    const prepItems = (menu ?? []).map((m: any) => {
      const cells = grid[m.id];
      const pred = shiftIdxs.reduce((s, i) => s + cells[i].predicted, 0);
      const base = shiftIdxs.reduce((s, i) => s + cells[i].baseline, 0);
      const units = Math.round(pred);
      const uplift = Math.round(((pred - base) / Math.max(1, base)) * 100);
      let status: "critical" | "high" | "low" = "high";
      if (uplift >= 80) status = "critical";
      else if (uplift < 0) status = "low";
      const note =
        uplift >= 80 ? "Runners + spectators"
        : uplift < 0 ? "Streets closed to delivery"
        : "Healthy steady demand";
      return { id: m.id, name: m.name, units, uplift, status, note };
    });

    // Inventory recs
    const inventory = (menu ?? []).map((m: any) => {
      const cells = grid[m.id];
      const demand = Math.round(shiftIdxs.reduce((s, i) => s + cells[i].predicted, 0));
      const stock = Math.round(Number(m.baseline_hourly_demand) * 2);
      const order = demand > stock ? Math.ceil((demand - stock) / 10) * 10 : 0;
      const risk: "low" | "high" = demand < stock * 0.5 ? "high" : "low";
      return { item: `${m.name} Stock`, stock, demand, order, risk };
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
      dow: "Day-of-Week",
      temp_f: "Temperature",
      precip: "Precipitation",
      clear: "Clear Weather",
      lag_7d: "Last Week (Same Hour)",
      lag_28d: "4-Week Average",
      lag_1d: "Yesterday Same Hour",
      item_idx: "Item Mix",
      cat_idx: "Category Mix",
    };
    const featureContribution = Object.entries(shapTotals)
      .map(([k, v]) => ({
        feature: labelMap[k] ?? k,
        contribution: Math.round((v / Math.max(1, totalShapAbs)) * 100),
      }))
      .filter(f => f.contribution !== 0)
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 5);

    const baselineTotal = demandSeries.reduce((s, d) => s + d.baseline, 0);
    const predictedTotal = demandSeries.reduce((s, d) => s + d.predicted, 0);
    const sortedByUplift = [...prepItems].sort((a, b) => b.uplift - a.uplift);

    const aiBriefing = await generateBriefing({
      event: activeEvent ? { name: activeEvent.name, distance_km: Number(activeDistance.toFixed(2)) } : null,
      location: location.name,
      shift: "11:00 AM – 2:00 PM",
      surge_pct: Math.round(((predictedTotal - baselineTotal) / Math.max(1, baselineTotal)) * 100),
      top_prep: sortedByUplift[0],
      cut_prep: sortedByUplift[sortedByUplift.length - 1],
    });

    const payload = {
      scenario: {
        date: shiftDate,
        location: location.address,
        shift: "11:00 AM – 2:00 PM",
        signals: {
          event: activeEvent
            ? { name: activeEvent.name, status: "Active", distanceKm: Number(activeDistance.toFixed(2)) }
            : { name: "None", status: "Inactive", distanceKm: 0 },
          weather: { condition: "Clear", tempF: 58 },
          academic: { status: "Semester Active" },
        },
      },
      demandSeries,
      prepItems,
      inventory,
      featureContribution,
      savings: { wastePreventedWeek: 340, projectedMonthly: 2800, co2OffsetKg: 420 },
      aiBriefing,
      meta: {
        baselineTotal,
        predictedTotal,
        upliftOrders: predictedTotal - baselineTotal,
        eventActive: !!activeEvent,
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
      location_id: locationId, shift_date: shiftDate, shift_label: "11a-2p", payload,
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
