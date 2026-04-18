// Builds the 60-feature vector for the quantity model.
// Real signals where possible, deterministic seeded random for unknown lags.

import { fetchWeather } from "./weather.ts";

// Mulberry32 deterministic PRNG seeded by restaurant_id + date
function seededRand(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let s = h >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NEIGHBORHOOD_LIST = [
  "Allston", "Back Bay", "Brookline", "Cambridge", "Fenway",
  "Jamaica Plain", "Kenmore", "North End", "Seaport", "South End",
];

function neighborhoodCode(name: string | null): number {
  if (!name) return -1;
  const idx = NEIGHBORHOOD_LIST.indexOf(name);
  return idx >= 0 ? idx : -1;
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const BOSTON_CENTER = { lat: 42.3601, lng: -71.0589 };
const MARATHON_FINISH = { lat: 42.3496, lng: -71.0788 }; // Boylston St

// Neighborhood demographic priors (rough Boston census-ish defaults)
const NBH_DEMOGRAPHICS: Record<string, { medianAge: number; pct18_24: number; pct25_44: number; pct45_64: number; pct65: number; pop: number }> = {
  "Allston":      { medianAge: 24, pct18_24: 0.45, pct25_44: 0.35, pct45_64: 0.12, pct65: 0.05, pop: 30000 },
  "Back Bay":     { medianAge: 35, pct18_24: 0.18, pct25_44: 0.40, pct45_64: 0.25, pct65: 0.12, pop: 19000 },
  "Brookline":    { medianAge: 33, pct18_24: 0.20, pct25_44: 0.38, pct45_64: 0.25, pct65: 0.13, pop: 60000 },
  "Cambridge":    { medianAge: 31, pct18_24: 0.30, pct25_44: 0.38, pct45_64: 0.20, pct65: 0.10, pop: 118000 },
  "Fenway":       { medianAge: 26, pct18_24: 0.38, pct25_44: 0.36, pct45_64: 0.16, pct65: 0.07, pop: 33000 },
  "Jamaica Plain":{ medianAge: 36, pct18_24: 0.12, pct25_44: 0.42, pct45_64: 0.28, pct65: 0.13, pop: 41000 },
  "Kenmore":      { medianAge: 25, pct18_24: 0.42, pct25_44: 0.35, pct45_64: 0.15, pct65: 0.06, pop: 12000 },
  "North End":    { medianAge: 32, pct18_24: 0.22, pct25_44: 0.42, pct45_64: 0.22, pct65: 0.10, pop: 10000 },
  "Seaport":      { medianAge: 33, pct18_24: 0.20, pct25_44: 0.45, pct45_64: 0.22, pct65: 0.08, pop: 8000 },
  "South End":    { medianAge: 35, pct18_24: 0.15, pct25_44: 0.45, pct45_64: 0.25, pct65: 0.12, pop: 30000 },
};

export interface RestaurantInput {
  id: string;
  lat: number;
  lng: number;
  neighborhood: string | null;
  price_tier: number;
  avg_rating: number;
  seating_capacity: number;
  is_health_focused: boolean;
  is_fast_food: boolean;
  has_delivery: boolean;
  delivery_ratio: number;
  avg_order_size: number;
}

export interface NearbyEvents {
  within5: number;
  within10: number;
  attendanceSum: number;
  hasMajor: boolean;
  impactRankAvg: number;
}

export interface BuildContext {
  restaurant: RestaurantInput;
  date: string; // YYYY-MM-DD
  events: NearbyEvents;
  weather: {
    temp_avg: number;
    temp_max: number;
    temp_min: number;
    feels_like_avg: number;
    precip_mm_sum: number;
    wind_speed_avg: number;
    humidity_avg: number;
    is_rainy_day: number;
  };
  academic: {
    active: number;
    examWeek: number;
    springBreak: number;
    commencement: number;
    moveIn: number;
    moveOut: number;
    activityIndex: number;
  };
}

// Feature names must match the model's feature_names in EXACT order
export const FEATURE_NAMES = [
  "revenue", "lat", "lng", "neighborhood", "price_tier", "avg_rating",
  "seating_capacity", "is_health_focused", "is_fast_food", "has_delivery",
  "delivery_ratio", "avg_order_size", "dist_to_marathon_km",
  "dow", "is_weekend", "week_of_year", "month", "is_month_start", "is_month_end",
  "temp_avg", "temp_max", "temp_min", "feels_like_avg", "precip_mm_sum",
  "wind_speed_avg", "humidity_avg", "is_rainy_day",
  "active_universities", "exam_week_universities", "spring_break_universities",
  "commencement_universities", "move_in_universities", "move_out_universities",
  "academic_activity_index",
  "events_within_5km", "events_within_10km", "nearby_attendance_sum",
  "nearby_impact_rank_avg", "has_major_event_nearby",
  "nearby_food_saturation_sum", "nearby_spillover_pct_avg",
  "nearby_food_vendor_conf_avg", "nearby_food_vendor_events",
  "median_age_nbh", "pct_18_24_nbh", "pct_25_44_nbh", "pct_45_64_nbh",
  "pct_65_plus_nbh", "population_nbh", "dist_to_boston_center_km",
  "covers_lag_1d", "covers_lag_7d", "revenue_lag_1d", "revenue_lag_7d",
  "covers_roll7_mean", "revenue_roll7_mean",
  "event_attendance_x_weekend", "event_attendance_x_precip",
  "health_focus_x_food_saturation", "delivery_ratio_x_precip",
];

export function buildFeatureVector(ctx: BuildContext): number[] {
  const r = ctx.restaurant;
  const d = new Date(ctx.date + "T12:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0
  const isWeekend = dow >= 5 ? 1 : 0;
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const isMonthStart = day <= 3 ? 1 : 0;
  const isMonthEnd = day >= 28 ? 1 : 0;
  // ISO week
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - tmp.getTime()) / 86400000 + tmp.getUTCDay() + 1) / 7);

  const distMarathon = distanceKm(r.lat, r.lng, MARATHON_FINISH.lat, MARATHON_FINISH.lng);
  const distCenter = distanceKm(r.lat, r.lng, BOSTON_CENTER.lat, BOSTON_CENTER.lng);

  const nbh = r.neighborhood ?? "Cambridge";
  const demo = NBH_DEMOGRAPHICS[nbh] ?? NBH_DEMOGRAPHICS["Cambridge"];

  // Seeded "lag" features — stable per (restaurant, date)
  const rng = seededRand(`${r.id}|${ctx.date}`);
  const baselineCovers = r.seating_capacity * 4.5; // ~4.5 turnovers/day baseline
  const baselineRevenue = baselineCovers * r.avg_order_size;
  const jitter = (mean: number, pct: number) => mean * (1 + (rng() - 0.5) * pct);

  const coversLag1d = jitter(baselineCovers, 0.4);
  const coversLag7d = jitter(baselineCovers, 0.3);
  const revenueLag1d = jitter(baselineRevenue, 0.4);
  const revenueLag7d = jitter(baselineRevenue, 0.3);
  const coversRoll7 = jitter(baselineCovers, 0.15);
  const revenueRoll7 = jitter(baselineRevenue, 0.15);

  // Food vendor / saturation priors (seeded per restaurant)
  const foodSaturation = 5 + rng() * 30;
  const spilloverPct = 0.05 + rng() * 0.25;
  const vendorConf = 0.3 + rng() * 0.6;
  const vendorEvents = Math.floor(rng() * 5);

  // Interactions (must match training)
  const evt_x_weekend = ctx.events.attendanceSum * isWeekend;
  const evt_x_precip = ctx.events.attendanceSum * ctx.weather.precip_mm_sum;
  const health_x_sat = (r.is_health_focused ? 1 : 0) * foodSaturation;
  const delivery_x_precip = r.delivery_ratio * ctx.weather.precip_mm_sum;

  const features: number[] = [
    revenueLag1d,                            // revenue (proxy — model uses today's revenue as input, we feed yesterday's)
    r.lat, r.lng,
    neighborhoodCode(r.neighborhood),
    r.price_tier, r.avg_rating, r.seating_capacity,
    r.is_health_focused ? 1 : 0,
    r.is_fast_food ? 1 : 0,
    r.has_delivery ? 1 : 0,
    r.delivery_ratio, r.avg_order_size,
    distMarathon,
    dow, isWeekend, week, month, isMonthStart, isMonthEnd,
    ctx.weather.temp_avg, ctx.weather.temp_max, ctx.weather.temp_min,
    ctx.weather.feels_like_avg, ctx.weather.precip_mm_sum,
    ctx.weather.wind_speed_avg, ctx.weather.humidity_avg, ctx.weather.is_rainy_day,
    ctx.academic.active, ctx.academic.examWeek, ctx.academic.springBreak,
    ctx.academic.commencement, ctx.academic.moveIn, ctx.academic.moveOut,
    ctx.academic.activityIndex,
    ctx.events.within5, ctx.events.within10, ctx.events.attendanceSum,
    ctx.events.impactRankAvg, ctx.events.hasMajor ? 1 : 0,
    foodSaturation, spilloverPct, vendorConf, vendorEvents,
    demo.medianAge, demo.pct18_24, demo.pct25_44, demo.pct45_64, demo.pct65, demo.pop,
    distCenter,
    coversLag1d, coversLag7d, revenueLag1d, revenueLag7d,
    coversRoll7, revenueRoll7,
    evt_x_weekend, evt_x_precip, health_x_sat, delivery_x_precip,
  ];

  return features;
}

// Build weather + academic + events context for a date/location
export async function buildContext(
  restaurant: RestaurantInput,
  date: string,
  events: { lat: number | null; lng: number | null; expected_attendance: number | null; radius_km: number; event_date: string }[],
): Promise<BuildContext> {
  // Weather: aggregate hourly to daily
  const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const wx = await fetchWeather(restaurant.lat, restaurant.lng, date, HOURS);
  const hourly = Object.values(wx.byHour);
  const tempF = hourly.map(h => h.temp_f);
  const precip = hourly.map(h => h.precip);
  const tempC = (f: number) => (f - 32) * 5 / 9;
  const tempAvg = tempC(tempF.reduce((a, b) => a + b, 0) / Math.max(1, tempF.length));
  const tempMax = tempC(Math.max(...tempF));
  const tempMin = tempC(Math.min(...tempF));
  const precipSum = precip.reduce((a, b) => a + b, 0);
  const isRainy = precipSum > 1 ? 1 : 0;

  // Events: filter to date & compute proximity buckets
  const todays = events.filter(e => e.event_date === date && e.lat !== null && e.lng !== null);
  let within5 = 0, within10 = 0, attendanceSum = 0, hasMajor = false;
  for (const e of todays) {
    const d = distanceKm(restaurant.lat, restaurant.lng, e.lat!, e.lng!);
    if (d <= 5) within5++;
    if (d <= 10) within10++;
    if (d <= 10) attendanceSum += Number(e.expected_attendance ?? 0);
    if ((e.expected_attendance ?? 0) > 20000) hasMajor = true;
  }

  // Academic — simple month-based heuristic for Boston universities
  const m = new Date(date + "T12:00:00Z").getUTCMonth() + 1;
  const inSession = (m >= 1 && m <= 5) || (m >= 9 && m <= 12);
  const academic = {
    active: inSession ? 6 : 1,
    examWeek: (m === 5 || m === 12) ? 4 : 0,
    springBreak: m === 3 ? 2 : 0,
    commencement: m === 5 ? 3 : 0,
    moveIn: m === 9 ? 5 : 0,
    moveOut: m === 5 ? 4 : 0,
    activityIndex: inSession ? 0.7 : 0.2,
  };

  return {
    restaurant,
    date,
    events: { within5, within10, attendanceSum, hasMajor, impactRankAvg: hasMajor ? 7 : 3 },
    weather: {
      temp_avg: tempAvg, temp_max: tempMax, temp_min: tempMin,
      feels_like_avg: tempAvg - 1,
      precip_mm_sum: precipSum,
      wind_speed_avg: 12, humidity_avg: 65,
      is_rainy_day: isRainy,
    },
    academic,
  };
}
