import { CheckCircle2, AlertTriangle, Send, TrendingDown, DollarSign, Leaf, Package, Clock } from "lucide-react";
import { forwardRef, useState } from "react";
import { usePrediction } from "@/hooks/usePrediction";

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

interface SavingsCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sublabel: string;
  highlight?: boolean;
}

const SavingsCard = forwardRef<HTMLDivElement, SavingsCardProps>(
  ({ icon: Icon, label, value, sublabel, highlight = false }, ref) => (
    <div
      ref={ref}
      className={`rounded-2xl border p-5 shadow-elev-sm transition-all ${highlight ? "border-success/30 bg-gradient-success text-success-foreground shadow-elev-md" : "border-border bg-card"}`}
    >
      <div className="flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${highlight ? "bg-success-foreground/20" : "bg-success-soft"}`}>
          <Icon className={`h-4 w-4 ${highlight ? "text-success-foreground" : "text-success"}`} />
        </div>
        <span className={`text-[11px] font-bold uppercase tracking-wider ${highlight ? "text-success-foreground/90" : "text-muted-foreground"}`}>
          {label}
        </span>
      </div>
      <div className={`mt-3 text-4xl font-bold tracking-tight ${highlight ? "text-success-foreground" : "text-foreground"}`}>{value}</div>
      <div className={`mt-1 text-xs font-medium ${highlight ? "text-success-foreground/80" : "text-muted-foreground"}`}>{sublabel}</div>
    </div>
  )
);
SavingsCard.displayName = "SavingsCard";

export const ManagerView = () => {
  const [sent, setSent] = useState(false);
  const { data } = usePrediction();
  const inventory = data?.inventory ?? [];
  const savings = data?.savings ?? { wastePreventedWeek: 0, projectedMonthly: 0, co2OffsetKg: 0 };

  const totalLines = inventory.length;
  const lowStockCount = inventory.filter((r) => r.risk === "high").length;
  const itemsToOrder = inventory.filter((r) => r.order > 0).length;
  const totalUnitsToOrder = inventory.reduce((s, r) => s + r.order, 0);

  return (
    <div className="fade-swap space-y-6">
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Impact & Savings</h1>
            <p className="text-sm text-muted-foreground">Live for week of Apr 20, 2026 — Boylston St location.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <SavingsCard icon={TrendingDown} label="Waste Prevented (Week)" value={`$${savings.wastePreventedWeek}`} sublabel="vs. prior 4-week avg" highlight />
          <SavingsCard icon={DollarSign} label="Projected Monthly Savings" value={`$${savings.projectedMonthly.toLocaleString()}`} sublabel="If model recommendations followed" />
          <SavingsCard icon={Leaf} label="CO₂ Offset" value={`${savings.co2OffsetKg}kg`} sublabel="From food + packaging avoided" />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-elev-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="text-base font-bold text-foreground">Inventory & Reorder</h2>
            <p className="text-xs text-muted-foreground">
              {totalLines} SKUs tracked · <span className="font-semibold text-danger">{lowStockCount}</span> at risk · <span className="font-semibold text-accent">{itemsToOrder}</span> need reorder
            </p>
          </div>
          <button
            onClick={() => setSent(true)}
            disabled={sent || itemsToOrder === 0}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-elev-md transition-all hover:shadow-elev-lg disabled:opacity-70"
          >
            <Send className="h-3.5 w-3.5" />
            {sent ? "Purchase Order Sent ✓" : `Send Purchase Order (${totalUnitsToOrder} units)`}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Item</th>
                <th className="px-3 py-3 text-right">On Hand</th>
                <th className="px-3 py-3 text-right">Par</th>
                <th className="px-3 py-3 text-right">Predicted Demand</th>
                <th className="px-3 py-3 text-right">Recommended Order</th>
                <th className="px-3 py-3 text-right">Last Counted</th>
                <th className="px-5 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {inventory.map((row) => {
                const stockPct = Math.min(100, Math.round((row.stock / Math.max(1, row.par)) * 100));
                const barColor = row.risk === "high" ? "bg-danger" : stockPct < 50 ? "bg-warning" : "bg-success";
                return (
                  <tr key={row.item} className="transition-colors hover:bg-muted/30">
                    <td className="px-5 py-4 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        {row.item}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <div className="tabular-nums font-semibold text-foreground">{row.stock} <span className="text-[10px] font-normal text-muted-foreground">{row.unit}</span></div>
                      <div className="mt-1 h-1 w-16 ml-auto rounded-full bg-muted overflow-hidden">
                        <div className={`h-full ${barColor} transition-all`} style={{ width: `${stockPct}%` }} />
                      </div>
                    </td>
                    <td className="px-3 py-4 text-right tabular-nums text-muted-foreground">{row.par}</td>
                    <td className="px-3 py-4 text-right tabular-nums font-semibold text-foreground">{row.demand}</td>
                    <td className="px-3 py-4 text-right">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold tabular-nums ${row.order > 0 ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}>
                        {row.order > 0 ? `+${row.order}` : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                        <Clock className="h-3 w-3" />
                        {timeAgo(row.lastCounted)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {row.risk === "high" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-danger/20 bg-danger-soft px-2.5 py-1 text-[11px] font-bold text-danger">
                          <AlertTriangle className="h-3 w-3" />
                          Will Stockout
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-success/20 bg-success-soft px-2.5 py-1 text-[11px] font-bold text-success">
                          <CheckCircle2 className="h-3 w-3" />
                          Healthy
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
