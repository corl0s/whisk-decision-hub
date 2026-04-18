import { ArrowDownRight, ArrowUpRight, Brain, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { usePrediction } from "@/hooks/usePrediction";

const directionStyle = {
  up: {
    chip: "bg-success-soft text-success border-success/20",
    bar: "bg-success",
    text: "text-success",
    Icon: ArrowUpRight,
  },
  down: {
    chip: "bg-danger-soft text-danger border-danger/20",
    bar: "bg-danger",
    text: "text-danger",
    Icon: ArrowDownRight,
  },
  neutral: {
    chip: "bg-muted text-muted-foreground border-border",
    bar: "bg-muted-foreground",
    text: "text-muted-foreground",
    Icon: Minus,
  },
} as const;

export const DriverCards = () => {
  const { data } = usePrediction();
  const signals = data?.activeSignals ?? [];
  const net = data?.meta.netImpactPct ?? 0;
  const lifts = data?.meta.liftCount ?? 0;
  const drags = data?.meta.dragCount ?? 0;
  const maxAbs = Math.max(1, ...signals.map((s) => Math.abs(s.contribution)));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-elev-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
          <Brain className="h-3.5 w-3.5 text-accent" />
        </div>
        <h3 className="text-sm font-bold text-foreground">What's driving the prediction</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {lifts > 0 || drags > 0 ? (
          <>
            <span className="font-semibold text-success">{lifts} lifting</span>
            <span className="mx-1">·</span>
            <span className="font-semibold text-danger">{drags} suppressing</span>
            <span className="mx-1">·</span>
            <span>% = each factor's share of demand impact</span>
          </>
        ) : (
          "Top model feature contributions to predicted demand."
        )}
      </p>

      {/* Net impact summary tile */}
      <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-gradient-surface px-4 py-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Net Driver Impact
          </div>
          <div className="text-[11px] text-muted-foreground">vs. typical day pattern</div>
        </div>
        <div className={`flex items-center gap-1 text-2xl font-bold tabular-nums ${net >= 0 ? "text-success" : "text-danger"}`}>
          {net >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          {net >= 0 ? "+" : ""}{net}%
        </div>
      </div>

      {/* Driver cards */}
      <div className="mt-4 space-y-2.5">
        {signals.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            No strong signals — model is on its baseline pattern.
          </div>
        )}
        {signals.map((s) => {
          const style = directionStyle[s.direction];
          const Icon = style.Icon;
          const widthPct = Math.max(8, Math.round((Math.abs(s.contribution) / maxAbs) * 100));
          return (
            <div
              key={s.key}
              className="rounded-xl border border-border bg-background/40 p-3 transition-colors hover:bg-background/70"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-bold text-foreground">{s.feature}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                    {s.rawValue} · {s.context}
                  </div>
                </div>
                <div
                  className={`inline-flex shrink-0 items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${style.chip}`}
                  title="Share of total demand impact"
                >
                  <Icon className="h-3 w-3" />
                  {s.contribution >= 0 ? "+" : ""}{s.contribution}% demand
                </div>
              </div>

              {/* Magnitude bar */}
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${style.bar}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>

              <p className={`mt-2 text-[11px] leading-snug ${style.text}`}>
                {s.explanation}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
