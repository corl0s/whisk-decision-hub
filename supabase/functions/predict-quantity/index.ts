// /predict-quantity — runs the trained LightGBM regressor (covers per day)
// for the authenticated owner's restaurant on a given date.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { predict, type QuantityModel } from "./treeWalker.ts";
import { buildFeatureVector, buildContext, FEATURE_NAMES, type RestaurantInput } from "./featureBuilder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MODEL_URL = `${SUPABASE_URL}/storage/v1/object/public/model-artifacts/quantity-model-v1.json`;

let modelCache: QuantityModel | null = null;
async function loadModel(): Promise<QuantityModel> {
  if (modelCache) return modelCache;
  const r = await fetch(MODEL_URL);
  if (!r.ok) throw new Error(`model fetch failed ${r.status}`);
  modelCache = await r.json() as QuantityModel;
  console.log(`quantity model loaded: ${modelCache.version} ${modelCache.n_trees} trees`);
  return modelCache;
}

const FRIENDLY: Record<string, string> = {
  revenue: "Recent Revenue",
  lat: "Latitude", lng: "Longitude",
  neighborhood: "Neighborhood", price_tier: "Price Tier", avg_rating: "Average Rating",
  seating_capacity: "Seating Capacity",
  is_health_focused: "Health-focused Menu", is_fast_food: "Fast-food Format",
  has_delivery: "Has Delivery", delivery_ratio: "Delivery Share",
  avg_order_size: "Average Order Size", dist_to_marathon_km: "Distance to Marathon",
  dow: "Day of Week", is_weekend: "Weekend", week_of_year: "Week of Year",
  month: "Month", is_month_start: "Start of Month", is_month_end: "End of Month",
  temp_avg: "Temperature", temp_max: "Daytime High", temp_min: "Overnight Low",
  feels_like_avg: "Feels-like Temp", precip_mm_sum: "Precipitation",
  wind_speed_avg: "Wind Speed", humidity_avg: "Humidity", is_rainy_day: "Rainy Day",
  active_universities: "Universities In Session",
  exam_week_universities: "Exam Week", spring_break_universities: "Spring Break",
  commencement_universities: "Commencement", move_in_universities: "Move-In Week",
  move_out_universities: "Move-Out Week", academic_activity_index: "Academic Activity",
  events_within_5km: "Events <5km", events_within_10km: "Events <10km",
  nearby_attendance_sum: "Nearby Crowd Size", nearby_impact_rank_avg: "Event Impact",
  has_major_event_nearby: "Major Event Nearby",
  nearby_food_saturation_sum: "Food Saturation",
  nearby_spillover_pct_avg: "Spillover Customers",
  nearby_food_vendor_conf_avg: "Vendor Competition",
  nearby_food_vendor_events: "Food Vendors at Events",
  median_age_nbh: "Neighborhood Median Age", pct_18_24_nbh: "Young Adults (18-24)",
  pct_25_44_nbh: "Adults (25-44)", pct_45_64_nbh: "Adults (45-64)",
  pct_65_plus_nbh: "Seniors (65+)", population_nbh: "Neighborhood Population",
  dist_to_boston_center_km: "Distance to Downtown",
  covers_lag_1d: "Yesterday's Covers", covers_lag_7d: "Last Week Same Day",
  revenue_lag_1d: "Yesterday's Revenue", revenue_lag_7d: "Last Week Revenue",
  covers_roll7_mean: "7-day Covers Avg", revenue_roll7_mean: "7-day Revenue Avg",
  event_attendance_x_weekend: "Events × Weekend",
  event_attendance_x_precip: "Events × Rain",
  health_focus_x_food_saturation: "Health Focus × Saturation",
  delivery_ratio_x_precip: "Delivery × Rain",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const date: string = body.date ?? new Date().toISOString().slice(0, 10);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: restaurant } = await admin
      .from("restaurants").select("*").eq("owner_user_id", userId).single();
    if (!restaurant || !restaurant.lat || !restaurant.lng) {
      return new Response(JSON.stringify({ error: "Restaurant profile incomplete" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: events } = await admin
      .from("events").select("lat,lng,expected_attendance,radius_km,event_date")
      .eq("event_date", date);

    const restaurantInput: RestaurantInput = {
      id: restaurant.id,
      lat: restaurant.lat, lng: restaurant.lng,
      neighborhood: restaurant.neighborhood,
      price_tier: restaurant.price_tier ?? 2,
      avg_rating: Number(restaurant.avg_rating ?? 4.0),
      seating_capacity: restaurant.seating_capacity ?? 60,
      is_health_focused: !!restaurant.is_health_focused,
      is_fast_food: !!restaurant.is_fast_food,
      has_delivery: !!restaurant.has_delivery,
      delivery_ratio: Number(restaurant.delivery_ratio ?? 0.25),
      avg_order_size: Number(restaurant.avg_order_size ?? 28),
    };

    const ctx = await buildContext(restaurantInput, date, (events ?? []) as any);
    const features = buildFeatureVector(ctx);

    const model = await loadModel();
    const { value, featureUsage } = predict(model, features);
    const predictedCovers = Math.max(0, value);
    const recommendedQty = Math.round(predictedCovers);

    // Top driver features by tree-split frequency
    const topDrivers = Object.entries(featureUsage)
      .map(([idx, count]) => {
        const name = FEATURE_NAMES[Number(idx)];
        return { feature: FRIENDLY[name] ?? name, key: name, splits: count, value: features[Number(idx)] };
      })
      .sort((a, b) => b.splits - a.splits)
      .slice(0, 6);

    // Menu split — proportional to baseline_hourly_demand of any menu_items
    // owned by the demo location (or fall back to a generic split).
    const { data: menuItems } = await admin
      .from("menu_items").select("name,baseline_hourly_demand,category").limit(20);
    const items = (menuItems ?? []);
    const totalBaseline = items.reduce((s, m) => s + Number(m.baseline_hourly_demand), 0) || 1;
    const menuSplit = items.map(m => ({
      name: m.name,
      category: m.category,
      qty: Math.round(predictedCovers * Number(m.baseline_hourly_demand) / totalBaseline),
    })).sort((a, b) => b.qty - a.qty).slice(0, 10);

    const payload = {
      date,
      predictedCovers: Number(predictedCovers.toFixed(1)),
      recommendedQty,
      drivers: topDrivers,
      menuSplit,
      context: {
        weather: ctx.weather,
        events: ctx.events,
        academic: ctx.academic,
        isHoliday: false,
      },
      model: {
        version: model.version,
        trees: model.n_trees,
        feature_count: features.length,
      },
    };

    // Cache
    await admin.from("daily_predictions").upsert({
      restaurant_id: restaurant.id,
      prediction_date: date,
      predicted_covers: predictedCovers,
      recommended_qty: recommendedQty,
      payload,
    }, { onConflict: "restaurant_id,prediction_date" });

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("predict-quantity error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
