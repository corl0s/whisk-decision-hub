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
  demandSeries: Array<{ hour: string; baseline: number; predicted: number }>;
  prepItems: Array<{
    id: string;
    name: string;
    units: number;
    uplift: number;
    status: PrepStatus;
    note: string;
  }>;
  inventory: Array<{
    item: string;
    stock: number;
    demand: number;
    order: number;
    risk: "low" | "high";
  }>;
  featureContribution: Array<{ feature: string; contribution: number }>;
  savings: { wastePreventedWeek: number; projectedMonthly: number; co2OffsetKg: number };
  aiBriefing: string;
  meta: {
    baselineTotal: number;
    predictedTotal: number;
    upliftOrders: number;
    eventActive: boolean;
  };
}

export async function fetchPrediction(params?: {
  location_id?: string;
  date?: string;
}): Promise<PredictResponse> {
  const { data, error } = await supabase.functions.invoke("predict", {
    body: params ?? {},
  });
  if (error) throw error;
  return data as PredictResponse;
}
