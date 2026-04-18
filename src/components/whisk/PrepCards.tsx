import { ArrowDownRight, ArrowUpRight, Flame, Sparkles, TrendingDown } from "lucide-react";
import { usePrediction } from "@/hooks/usePrediction";
import type { PrepStatus } from "@/lib/whiskApi";

const statusConfig: Record<
  PrepStatus,
  { label: string; chip: string; icon: React.ComponentType<{ className?: string }>; ring: string }
> = {
  critical: { label: "Critical", chip: "bg-danger-soft text-danger border-danger/20", icon: Flame, ring: "ring-1 ring-danger/30" },
  high: { label: "High Urgency", chip: "bg-warning-soft text-warning border-warning/20", icon: Sparkles, ring: "ring-1 ring-warning/30" },
  low: { label: "Low Priority", chip: "bg-muted text-muted-foreground border-border", icon: TrendingDown, ring: "" },
};

export const PrepCards = () => {
  const { data } = usePrediction();
  const items = (data?.prepItems ?? []).slice(0, 3);
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => {
        const cfg = statusConfig[item.status];
        const Icon = cfg.icon;
        const pct = Math.round((item.ratio - 1) * 100);
        const positive = pct >= 0;
        return (
          <div key={item.id} className={`group rounded-2xl border border-border bg-card p-5 shadow-elev-sm transition-all hover:shadow-elev-md ${cfg.ring}`}>
            <div className="flex items-start justify-between gap-2">
              <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${cfg.chip}`}>
                <Icon className="h-3 w-3" />
                {cfg.label}
              </div>
              <div className={`flex items-center gap-0.5 text-xs font-semibold ${positive ? "text-success" : "text-muted-foreground"}`}>
                {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {positive ? "+" : ""}{pct}% vs typical
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm font-medium text-muted-foreground">{item.name}</div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold tracking-tight text-foreground">{item.units}</span>
                <span className="text-sm font-medium text-muted-foreground">units</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{item.note}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
