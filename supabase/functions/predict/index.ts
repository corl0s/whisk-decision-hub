// Whisk Labs /predict — heuristic demand forecast + AI Chef's Briefing
// Returns the same schema the UI consumes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// Haversine distance in km
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Per-category multiplier when a marathon is within radius
const MARATHON_UPLIFT: Record<string, number> = {
  hydration: 2.67, // +167%
  bowl: 1.36, // +36%
  sandwich: 0.43, // -57% (streets closed to delivery)
  beverage: 1.25,
};

const HOURS = ["8a", "9a", "10a", "11a", "12p", "1p", "2p", "3p", "4p", "5p", "6p", "7p"];
// Hourly shape: relative weight by hour for an event-day (peaks midday)
const EVENT_SHAPE = [0.5, 0.9, 2.2, 4.0, 5.5, 5.1, 4.3, 3.1, 2.3, 1.3, 1.1, 0.8];
const BASELINE_SHAPE = [0.6, 0.9, 1.2, 1.9, 2.8, 2.6, 2.0, 1.4, 1.1, 1.5, 1.8, 1.4];

async function generateBriefing(context: Record<string, unknown>): Promise<string> {
  if (!LOVABLE_API_KEY) {
    return "Marathon crowds are nearby. Expect a major surge in hydration and bowls. Hold back on hot sandwiches — streets are closed to delivery.";
  }
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are the AI head chef for a smart-kitchen platform. Write ONE punchy 2-3 sentence briefing for the kitchen team based on the forecast context. Mention the event, the biggest item to prep, the biggest item to hold back on, and a why. No bullet points, no headers. Plain text only.",
          },
          { role: "user", content: JSON.stringify(context) },
        ],
      }),
    });
    if (!resp.ok) {
      console.error("AI gateway error", resp.status, await resp.text());
      return "Marathon crowds are nearby. Expect a major surge in hydration and bowls. Hold back on hot sandwiches — streets are closed to delivery.";
    }
    const data = await resp.json();
    return (
      data.choices?.[0]?.message?.content?.trim() ??
      "Marathon crowds nearby — surge prep on hydration and bowls; cut sandwich prep."
    );
  } catch (e) {
    console.error("briefing error", e);
    return "Marathon crowds are nearby. Surge prep on hydration and bowls; cut sandwich prep.";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const locationId: string = body.location_id ?? "11111111-1111-1111-1111-111111111111";
    const shiftDate: string = body.date ?? "2026-04-21";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [{ data: location }, { data: menu }, { data: events }] = await Promise.all([
      supabase.from("locations").select("*").eq("id", locationId).single(),
      supabase.from("menu_items").select("*").eq("location_id", locationId),
      supabase.from("events").select("*").eq("event_date", shiftDate),
    ]);

    if (!location) {
      return new Response(JSON.stringify({ error: "location not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find nearest active event
    let activeEvent: any = null;
    let activeDistance = Infinity;
    for (const ev of events ?? []) {
      if (ev.lat == null || ev.lng == null) continue;
      const d = distanceKm(location.lat, location.lng, ev.lat, ev.lng);
      if (d <= Number(ev.radius_km) && d < activeDistance) {
        activeEvent = ev;
        activeDistance = d;
      }
    }

    // Compute hourly demand series (sum across menu)
    const totalBaselineHourly = (menu ?? []).reduce(
      (s: number, m: any) => s + Number(m.baseline_hourly_demand),
      0,
    );
    const eventMultiplier = activeEvent ? 3.5 : 1.0;
    const demandSeries = HOURS.map((hour, i) => ({
      hour,
      baseline: Math.round(totalBaselineHourly * BASELINE_SHAPE[i]),
      predicted: Math.round(totalBaselineHourly * EVENT_SHAPE[i] * eventMultiplier / 3.5 * (activeEvent ? 3.5 : 1)),
    }));

    // Per-item prep recommendations for 11a-2p shift
    const SHIFT_HOURS = 3;
    const prepItems = (menu ?? []).map((m: any) => {
      const base = Number(m.baseline_hourly_demand) * SHIFT_HOURS;
      const mult = activeEvent ? (MARATHON_UPLIFT[m.category] ?? 1.1) : 1.0;
      const units = Math.round(base * mult);
      const uplift = Math.round((mult - 1) * 100);
      let status: "critical" | "high" | "low" = "high";
      if (uplift >= 100) status = "critical";
      else if (uplift < 0) status = "low";
      const note =
        uplift >= 100
          ? "Runners + spectators"
          : uplift < 0
            ? "Streets closed to delivery"
            : "Healthy carb-load demand";
      return { id: m.id, name: m.name, units, uplift, status, note };
    });

    // Inventory recs (synthetic stock for the demo)
    const inventory = (menu ?? []).map((m: any) => {
      const demand = Math.round(
        Number(m.baseline_hourly_demand) * SHIFT_HOURS * (activeEvent ? MARATHON_UPLIFT[m.category] ?? 1.1 : 1.0),
      );
      const stock = Math.round(Number(m.baseline_hourly_demand) * 2);
      const order = demand > stock ? Math.ceil((demand - stock) / 10) * 10 : 0;
      const risk: "low" | "high" = demand < stock * 0.5 ? "high" : "low";
      return { item: `${m.name} Stock`, stock, demand, order, risk };
    });

    // Feature contribution (heuristic SHAP-style)
    const featureContribution = activeEvent
      ? [
          { feature: `${activeEvent.name}`, contribution: 32 },
          { feature: "Foot Traffic", contribution: 14 },
          { feature: "Weather (Clear)", contribution: 8 },
          { feature: "Seasonality", contribution: 5 },
          { feature: "Day-of-Week", contribution: 3 },
        ]
      : [
          { feature: "Day-of-Week", contribution: 8 },
          { feature: "Seasonality", contribution: 5 },
          { feature: "Weather", contribution: 3 },
        ];

    const baselineTotal = demandSeries.reduce((s, d) => s + d.baseline, 0);
    const predictedTotal = demandSeries.reduce((s, d) => s + d.predicted, 0);

    const briefingContext = {
      event: activeEvent
        ? { name: activeEvent.name, distance_km: Number(activeDistance.toFixed(2)) }
        : null,
      location: location.name,
      shift: "11:00 AM – 2:00 PM",
      surge_pct: Math.round(((predictedTotal - baselineTotal) / Math.max(1, baselineTotal)) * 100),
      top_prep: prepItems.sort((a, b) => b.uplift - a.uplift)[0],
      cut_prep: prepItems.sort((a, b) => a.uplift - b.uplift)[0],
    };
    const aiBriefing = await generateBriefing(briefingContext);

    const payload = {
      scenario: {
        date: shiftDate,
        location: location.address,
        shift: "11:00 AM – 2:00 PM",
        signals: {
          event: activeEvent
            ? {
                name: activeEvent.name,
                status: "Active",
                distanceKm: Number(activeDistance.toFixed(2)),
              }
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
      },
    };

    // Cache the prediction (best-effort)
    supabase
      .from("predictions")
      .insert({
        location_id: locationId,
        shift_date: shiftDate,
        shift_label: "11a-2p",
        payload,
      })
      .then(({ error }) => {
        if (error) console.error("cache insert failed", error);
      });

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
