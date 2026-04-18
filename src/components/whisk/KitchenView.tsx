import { DemandChart } from "./DemandChart";
import { AIBriefing } from "./AIBriefing";
import { MenuPanel } from "./MenuPanel";

export const KitchenView = () => {
  return (
    <div className="fade-swap space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-elev-md">
        <div className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Hourly Demand Forecast</h2>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-accent">
              <span className="h-0.5 w-3 bg-accent" />
              Predicted Orders
            </span>
          </div>
          <DemandChart />
        </div>
      </section>

      <MenuPanel />
      <AIBriefing />
    </div>
  );
};
