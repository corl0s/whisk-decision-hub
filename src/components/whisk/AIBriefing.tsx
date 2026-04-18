import { Sparkles } from "lucide-react";
import { usePrediction } from "@/hooks/usePrediction";

export const AIBriefing = () => {
  const { data } = usePrediction();
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-primary p-5 text-primary-foreground shadow-elev-md">
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/20 ring-1 ring-accent/30">
          <Sparkles className="h-4 w-4 text-accent" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold">Chef's Briefing</h3>
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
              AI · Live
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-primary-foreground/90">
            {data?.aiBriefing ?? "Generating briefing…"}
          </p>
        </div>
      </div>
    </div>
  );
};
