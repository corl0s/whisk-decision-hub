// Client for the /predict edge function.
import { supabase } from "@/integrations/supabase/client";

export type PrepStatus = "critical" | "high" | "low";

export interface PredictResponse {
  scenario: {
    date: string;
    location: string;
    shift: string;
    signals: {
      event: { name: string; status: string; distanceKm: number };
      weather: { condition: string; tempF: number };
      academic: { status: string };
    };
  };
  demandSeries: Array<{ hour: string; predicted: number }>;
  prepItems: Array<{
    id: string;
    name: string;
    units: number;
    ratio: number;
    status: PrepStatus;
    note: string;
  }>;
  inventory: Array<{
    item: string;
    stock: number;
    par: number;
    unit: string;
    demand: number;
    order: number;
    risk: "low" | "high";
    lastCounted: string | null;
  }>;
  featureContribution: Array<{ feature: string; contribution: number }>;
  activeSignals: Array<{
    key: string;
    feature: string;
    contribution: number;
    direction: "up" | "down" | "neutral";
    rawValue: string;
    context: string;
    explanation: string;
  }>;
  savings: { wastePreventedWeek: number; projectedMonthly: number; co2OffsetKg: number };
  aiBriefing: string;
  meta: {
    predictedTotal: number;
    peakHour: string | null;
    peakOrders: number;
    eventActive: boolean;
    netImpactPct: number;
    liftCount: number;
    dragCount: number;
    model?: {
      version: string;
      trees: number;
      trainedAt: string;
      valMape?: number;
    };
  };
}

export async function fetchPrediction(params?: {
  location_id?: string;
  date?: string;
  shift?: string;
}): Promise<PredictResponse> {
  const { data, error } = await supabase.functions.invoke("predict", {
    body: params ?? {},
  });
  if (error) throw error;
  return data as PredictResponse;
}
