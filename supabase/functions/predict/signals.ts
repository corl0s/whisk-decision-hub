// Build interpretable "driver cards" for the sidebar.
// Each card describes one model feature with: raw signal value (e.g. "47°F overcast"),
// short context, plain-English explanation, and a directional sign on contribution %.

const DOW_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface ActiveSignal {
  key: string;             // model feature key (e.g. "temp_f")
  feature: string;         // display label
  contribution: number;    // signed pct (-100..100)
  direction: "up" | "down" | "neutral";
  rawValue: string;        // "47°F overcast", "1.2 km away"
  context: string;         // "Cooler than typical (avg 58°F)"
  explanation: string;     // one-line plain English
}

export interface SignalContext {
  weather: { tempF: number; condition: string; precip: number };
  event: { name: string; distanceKm: number; attendance: number; active: boolean };
  dow: number;
  holiday: boolean;
  isoDate: string;
}

const TYPICAL_TEMP_F = 58;

function tempContext(tempF: number) {
  const diff = tempF - TYPICAL_TEMP_F;
  if (Math.abs(diff) < 5) return `Near typical (avg ${TYPICAL_TEMP_F}°F)`;
  if (diff >= 5) return `Warmer than typical by ${Math.round(diff)}°F`;
  return `Cooler than typical by ${Math.abs(Math.round(diff))}°F`;
}

// Helper: phrase a contribution as "lifts demand by X%" or "drags demand by X%"
function impactPhrase(contribution: number) {
  const mag = Math.abs(contribution);
  if (contribution >= 0) return `lifts demand ~${mag}%`;
  return `drags demand ~${mag}%`;
}

function tempExplain(tempF: number, contribution: number) {
  const impact = impactPhrase(contribution);
  if (contribution >= 0) {
    return tempF >= 70
      ? `Warm weather ${impact} (cold drinks + outdoor traffic)`
      : `Mild weather ${impact} (supports normal lunch volume)`;
  }
  return tempF < 50
    ? `Cold weather ${impact} (suppresses cold-drink + outdoor demand)`
    : `Off-peak temps ${impact} (softer walk-in traffic)`;
}

function precipExplain(precip: number, contribution: number) {
  const impact = impactPhrase(contribution);
  if (precip < 0.1) return `Dry conditions — ${impact} on foot traffic`;
  if (contribution >= 0) return `Light rain pushes customers indoors — ${impact}`;
  return `${precip.toFixed(1)}mm rain ${impact} (fewer walk-ins, less patio)`;
}

function eventExplain(distanceKm: number, attendance: number, contribution: number, eventName: string) {
  const distLabel = distanceKm < 0.1 ? "right at the location" : `within ${distanceKm.toFixed(1)} km`;
  const impact = impactPhrase(contribution);
  if (contribution >= 0) {
    return `${eventName} draws ~${attendance.toLocaleString()} spectators ${distLabel} — ${impact}`;
  }
  // Negative event contribution = model learned crowd-related drag (e.g. street closures, locals avoiding area)
  return `${eventName} crowds ${distLabel} ${impact} (street closures + locals avoiding area cap upside)`;
}

function dowExplain(dow: number, contribution: number) {
  const day = DOW_NAMES[dow] ?? "today";
  const isWeekend = dow >= 5;
  const impact = impactPhrase(contribution);
  if (contribution >= 0) {
    return isWeekend
      ? `${day}s typically run hotter than weekdays — ${impact}`
      : `${day} matches a strong historical pattern — ${impact}`;
  }
  return isWeekend
    ? `${day} is softer than a typical weekday for this menu — ${impact}`
    : `${day}s historically run cooler than mid-week — ${impact}`;
}

function lagExplain(label: string, contribution: number) {
  const impact = impactPhrase(contribution);
  if (contribution >= 0) return `${label} ran above expectations — ${impact} (model expects continuation)`;
  return `${label} ran below expectations — ${impact} (model dampens forecast)`;
}

export function buildActiveSignals(
  contributions: Array<{ key: string; contribution: number }>,
  ctx: SignalContext,
): ActiveSignal[] {
  return contributions.map(({ key, contribution }) => {
    const direction: ActiveSignal["direction"] =
      contribution > 1 ? "up" : contribution < -1 ? "down" : "neutral";

    switch (key) {
      case "temp_f":
        return {
          key, contribution, direction,
          feature: "Temperature",
          rawValue: `${ctx.weather.tempF}°F · ${ctx.weather.condition}`,
          context: tempContext(ctx.weather.tempF),
          explanation: tempExplain(ctx.weather.tempF, contribution),
        };
      case "precip":
        return {
          key, contribution, direction,
          feature: "Precipitation",
          rawValue: ctx.weather.precip > 0.05 ? `${ctx.weather.precip.toFixed(1)} mm` : "0 mm · dry",
          context: ctx.weather.precip > 0.5 ? "Wet shift" : "Dry shift",
          explanation: precipExplain(ctx.weather.precip, contribution),
        };
      case "clear":
        return {
          key, contribution, direction,
          feature: "Sky Conditions",
          rawValue: ctx.weather.condition,
          context: ctx.weather.condition === "Clear" ? "Clear skies" : "Cloud cover present",
          explanation: contribution >= 0
            ? `Clear weather draws walk-in foot traffic — ${impactPhrase(contribution)}`
            : `Overcast skies trim incidental walk-ins — ${impactPhrase(contribution)}`,
        };
      case "event_dist_km":
        return {
          key, contribution, direction,
          feature: ctx.event.active ? `${ctx.event.name} Proximity` : "Event Proximity",
          rawValue: ctx.event.active
            ? (ctx.event.distanceKm < 0.1 ? "At the location" : `${ctx.event.distanceKm.toFixed(1)} km away`)
            : "No event nearby",
          context: ctx.event.active ? "Within event radius" : "Out of range",
          explanation: ctx.event.active
            ? eventExplain(ctx.event.distanceKm, ctx.event.attendance, contribution, ctx.event.name)
            : "No nearby event signal",
        };
      case "event_attend":
        return {
          key, contribution, direction,
          feature: ctx.event.active ? `${ctx.event.name} Crowd` : "Crowd Size",
          rawValue: ctx.event.active ? `~${ctx.event.attendance.toLocaleString()} attendees` : "0 attendees",
          context: ctx.event.active ? "Major event crowd in range" : "No active crowd",
          explanation: ctx.event.active
            ? eventExplain(ctx.event.distanceKm, ctx.event.attendance, contribution, ctx.event.name)
            : "No crowd signal",
        };
      case "dow":
        return {
          key, contribution, direction,
          feature: "Day of Week",
          rawValue: DOW_NAMES[ctx.dow] ?? "—",
          context: ctx.holiday ? "Holiday — atypical day pattern" : "Standard weekday pattern",
          explanation: dowExplain(ctx.dow, contribution),
        };
      case "hour":
        return {
          key, contribution, direction,
          feature: "Time of Day",
          rawValue: "Lunch shift (11a–2p)",
          context: "Peak hours window",
          explanation: contribution >= 0
            ? `Hour-of-day pattern lifts demand at lunch peak — ${impactPhrase(contribution)}`
            : `Edge of peak window — ${impactPhrase(contribution)}`,
        };
      case "lag_7d":
        return {
          key, contribution, direction,
          feature: "Last Week (Same Hour)",
          rawValue: "Recent demand signal",
          context: "Trailing 7-day pattern",
          explanation: lagExplain("Last week", contribution),
        };
      case "lag_28d":
        return {
          key, contribution, direction,
          feature: "4-Week Average",
          rawValue: "Trailing baseline",
          context: "28-day rolling average",
          explanation: lagExplain("The 4-week trend", contribution),
        };
      case "lag_1d":
        return {
          key, contribution, direction,
          feature: "Yesterday Same Hour",
          rawValue: "Recent momentum",
          context: "Day-over-day signal",
          explanation: lagExplain("Yesterday", contribution),
        };
      case "item_idx":
        return {
          key, contribution, direction,
          feature: "Item Mix",
          rawValue: "Per-item learned bias",
          context: "Item-level effect",
          explanation: contribution >= 0
            ? `Top-selling items skew demand higher today — ${impactPhrase(contribution)}`
            : `Item mix runs cooler today — ${impactPhrase(contribution)}`,
        };
      case "cat_idx":
        return {
          key, contribution, direction,
          feature: "Category Mix",
          rawValue: "Per-category learned bias",
          context: "Category-level effect",
          explanation: contribution >= 0
            ? `Strong categories carry the day's demand — ${impactPhrase(contribution)}`
            : `Category mix is a slight drag today — ${impactPhrase(contribution)}`,
        };
      default:
        return {
          key, contribution, direction,
          feature: key,
          rawValue: "—",
          context: "Model feature",
          explanation: contribution >= 0 ? `Lifts forecast — ${impactPhrase(contribution)}` : `Suppresses forecast — ${impactPhrase(contribution)}`,
        };
    }
  });
}
