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

function tempExplain(tempF: number, contribution: number) {
  if (contribution >= 0) {
    return tempF >= 70
      ? "Warm weather lifts cold drinks and outdoor traffic"
      : "Mild weather supports normal lunch volume";
  }
  return tempF < 50
    ? "Cold weather suppresses cold-drink and outdoor demand"
    : "Off-peak temps soften walk-in traffic";
}

function precipExplain(precip: number, contribution: number) {
  if (precip < 0.1) return "Dry conditions — no weather drag on foot traffic";
  if (contribution >= 0) return "Light rain pushes customers indoors — slight bump";
  return `${precip.toFixed(1)}mm rain reduces walk-ins and outdoor seating`;
}

function eventExplain(distanceKm: number, attendance: number, contribution: number, eventName: string) {
  if (contribution >= 0) {
    return `${eventName} draws ~${attendance.toLocaleString()} people within ${distanceKm.toFixed(1)} km — major spectator surge`;
  }
  return `${eventName} street closures cut delivery access despite nearby crowds`;
}

function dowExplain(dow: number, contribution: number) {
  const day = DOW_NAMES[dow] ?? "today";
  const isWeekend = dow >= 5;
  if (contribution >= 0) {
    return isWeekend
      ? `${day}s typically run hotter than weekdays`
      : `${day} matches a strong historical pattern`;
  }
  return isWeekend
    ? `${day} is softer than a typical weekday for this menu`
    : `${day}s historically run cooler than mid-week`;
}

function lagExplain(label: string, contribution: number) {
  if (contribution >= 0) return `${label} ran above expectations — model expects continuation`;
  return `${label} ran below expectations — model dampens forecast`;
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
            ? "Clear weather draws walk-in foot traffic"
            : "Overcast skies trim incidental walk-ins",
        };
      case "event_dist_km":
        return {
          key, contribution, direction,
          feature: ctx.event.active ? `${ctx.event.name} Proximity` : "Event Proximity",
          rawValue: ctx.event.active ? `${ctx.event.distanceKm.toFixed(1)} km away` : "No event nearby",
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
            ? "Hour-of-day pattern lifts demand at lunch peak"
            : "Edge of peak window — softer than midday max",
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
            ? "Top-selling items skew demand higher today"
            : "Item mix runs cooler today",
        };
      case "cat_idx":
        return {
          key, contribution, direction,
          feature: "Category Mix",
          rawValue: "Per-category learned bias",
          context: "Category-level effect",
          explanation: contribution >= 0
            ? "Strong categories carry the day's demand"
            : "Category mix is a slight drag today",
        };
      default:
        return {
          key, contribution, direction,
          feature: key,
          rawValue: "—",
          context: "Model feature",
          explanation: contribution >= 0 ? "Lifts forecast" : "Suppresses forecast",
        };
    }
  });
}
