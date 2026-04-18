import { TrendingUp, Clock } from "lucide-react";
import { usePrediction } from "@/hooks/usePrediction";
import { DemandChart } from "./DemandChart";
import { AIBriefing } from "./AIBriefing";
import { MenuPanel } from "./MenuPanel";

export const KitchenView = () => {
  const { data } = usePrediction();
  const predictedTotal = data?.meta.predictedTotal ?? 0;
  const peakOrders = data?.meta.peakOrders ?? 0;
  const peakHour = data?.meta.peakHour;

  return (
    <div className="fade-swap space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-elev-md">
        <div className="p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Hourly Demand Forecast</h2>
              <span className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-accent">
                <span className="h-0.5 w-3 bg-accent" />
                Predicted Orders
              </span>
            </div>
            <div className="flex gap-2">
              <div className="rounded-xl border border-success/20 bg-success-soft px-4 py-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-success">
                  <TrendingUp className="h-3 w-3" /> Total predicted
                </div>
                <div className="mt-0.5 text-2xl font-bold text-success tabular-nums">{predictedTotal}</div>
                <div className="text-[10px] font-semibold text-success/80">orders this shift</div>
              </div>
              <div className="rounded-xl border border-accent/20 bg-accent/10 px-4 py-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                  <Clock className="h-3 w-3" /> Peak hour
                </div>
                <div className="mt-0.5 text-2xl font-bold text-accent tabular-nums">
                  {peakOrders}<span className="ml-1 text-sm">@{peakHour ?? "—"}</span>
                </div>
                <div className="text-[10px] font-semibold text-accent/80">orders at peak</div>
              </div>
            </div>
          </div>
          <DemandChart />
        </div>
      </section>

      <MenuPanel />
      <AIBriefing />
    </div>
  );
};
