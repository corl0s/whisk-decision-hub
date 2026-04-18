// Mock data mirroring a /predict API for Whisk Labs demo.
// Scenario: Boston Marathon Monday — April 21, 2026, restaurant on Boylston St.

export const scenario = {
  date: "Monday, April 21, 2026",
  location: "Boylston St, Boston, MA",
  shift: "11:00 AM – 2:00 PM",
  signals: {
    event: { name: "Boston Marathon", status: "Active", distanceKm: 0.8 },
    weather: { condition: "Clear", tempF: 58 },
    academic: { status: "Semester Active" },
  },
};

// Hourly demand (orders) — baseline vs. predicted Marathon Monday
export const demandSeries = [
  { hour: "8a",  baseline: 12, predicted: 18 },
  { hour: "9a",  baseline: 18, predicted: 32 },
  { hour: "10a", baseline: 24, predicted: 78 },
  { hour: "11a", baseline: 38, predicted: 142 },
  { hour: "12p", baseline: 56, predicted: 198 },
  { hour: "1p",  baseline: 52, predicted: 184 },
  { hour: "2p",  baseline: 40, predicted: 156 },
  { hour: "3p",  baseline: 28, predicted: 112 },
  { hour: "4p",  baseline: 22, predicted: 84 },
  { hour: "5p",  baseline: 30, predicted: 46 },
  { hour: "6p",  baseline: 36, predicted: 40 },
  { hour: "7p",  baseline: 28, predicted: 30 },
];

export type PrepStatus = "critical" | "high" | "low";

export const prepItems: Array<{
  id: string;
  name: string;
  units: number;
  uplift: number; // percent vs baseline
  status: PrepStatus;
  note: string;
}> = [
  { id: "hydration", name: "Hydration Drinks", units: 125, uplift: 167, status: "critical", note: "Runners + spectators" },
  { id: "grain",     name: "Grain Bowls",      units: 90,  uplift: 36,  status: "high",     note: "Healthy carb-load demand" },
  { id: "sandwich",  name: "Hot Sandwiches",   units: 20,  uplift: -57, status: "low",      note: "Streets closed to delivery" },
];

export const inventory = [
  { item: "Grain Bowl Ingredients", stock: 10, demand: 87, order: 80, risk: "low" as const },
  { item: "Cold-Pressed Juices",    stock: 24, demand: 110, order: 90, risk: "low" as const },
  { item: "Bottled Water (12oz)",   stock: 60, demand: 220, order: 180, risk: "low" as const },
  { item: "Sandwich Bread",         stock: 40, demand: 18,  order: 0,   risk: "high" as const },
  { item: "Deli Meats (lbs)",       stock: 22, demand: 9,   order: 0,   risk: "high" as const },
];

export const savings = {
  wastePreventedWeek: 340,
  projectedMonthly: 2800,
  co2OffsetKg: 420,
};

export const featureContribution = [
  { feature: "Marathon Event",   contribution: 32 },
  { feature: "Foot Traffic",     contribution: 14 },
  { feature: "Weather (Clear)",  contribution: 8 },
  { feature: "Seasonality",      contribution: 5 },
  { feature: "Day-of-Week",      contribution: 3 },
];

export const aiBriefing =
  "Marathon crowds are 0.8km away on Boylston St. Expect a 38% surge in healthy bowls and a 167% spike in hydration. Hold back on hot sandwiches — surrounding streets are closed to delivery drivers until 6pm.";
