import { Clock, MapPin, Calendar, Cpu } from "lucide-react";
import { usePrediction } from "@/hooks/usePrediction";
import { DemandChart } from "./DemandChart";
import { PrepCards } from "./PrepCards";
import { AIBriefing } from "./AIBriefing";

export const KitchenView = () => {
  const { data } = usePrediction();
  const scenario = data?.scenario;
  const peakHour = data?.meta.peakHour;
  const peakOrders = data?.meta.peakOrders ?? 0;
  const predictedTotal = data?.meta.predictedTotal ?? 0;
  const model = data?.meta.model;

  return (
    <div className="fade-swap space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-elev-md">
        <div className="grid gap-0 lg:grid-cols-[1fr_1.4fr]">
          <div className="border-b border-border bg-gradient-surface p-6 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent">
              <Clock className="h-3.5 w-3.5" />
              Next Shift
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Prep Guide</h1>
            <div className="mt-1 text-3xl font-bold text-primary md:text-4xl">{scenario?.shift}</div>

            <div className="mt-5 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {scenario?.date}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {scenario?.location}
              </div>
            </div>

            <div className="mt-6 flex items-baseline gap-2 rounded-xl border border-success/20 bg-success-soft px-4 py-3">
              <span className="text-3xl font-bold text-success">{uplift >= 0 ? "+" : ""}{uplift}</span>
              <span className="text-xs font-semibold text-success">predicted orders vs. baseline</span>
            </div>

            {model && (
              <div
                className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-2 py-1 text-[10px] font-medium text-muted-foreground"
                title={`${model.trees} trees · trained ${model.trainedAt}${model.valMape ? ` · val MAPE ${model.valMape.toFixed(0)}%` : ""}`}
              >
                <Cpu className="h-3 w-3" />
                Model: {model.version} · {model.trees} trees
              </div>
            )}
          </div>

          <div className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Hourly Demand Forecast</h2>
              <div className="flex items-center gap-3 text-[11px] font-medium">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-0.5 w-3 border-t-2 border-dashed border-muted-foreground" />
                  Baseline
                </span>
                <span className="flex items-center gap-1.5 text-accent">
                  <span className="h-0.5 w-3 bg-accent" />
                  Predicted
                </span>
              </div>
            </div>
            <DemandChart />
          </div>
        </div>
      </section>

      <PrepCards />
      <AIBriefing />
    </div>
  );
};
