import { useState } from "react";
import { Header } from "@/components/whisk/Header";
import { KitchenView } from "@/components/whisk/KitchenView";
import { ManagerView } from "@/components/whisk/ManagerView";
import { IntelligenceSidebar } from "@/components/whisk/IntelligenceSidebar";
import { PredictionProvider, usePrediction } from "@/hooks/usePrediction";
import { Loader2, AlertCircle } from "lucide-react";

type View = "kitchen" | "manager";

const Body = ({ view }: { view: View }) => {
  const { loading, error, data } = usePrediction();

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-border bg-card">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
          <p className="text-sm font-medium">Running live forecast…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-danger/20 bg-danger-soft p-6">
        <div className="flex flex-col items-center gap-2 text-center text-danger">
          <AlertCircle className="h-6 w-6" />
          <p className="text-sm font-semibold">Failed to load prediction</p>
          <p className="text-xs opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div key={view} className="min-w-0">
      {view === "kitchen" ? <KitchenView /> : <ManagerView />}
    </div>
  );
};

const Index = () => {
  const [view, setView] = useState<View>("kitchen");

  return (
    <PredictionProvider>
      <div className="min-h-screen bg-background">
        <Header view={view} onViewChange={setView} />

        <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <Body view={view} />
            <IntelligenceSidebar />
          </div>

          <footer className="mt-10 flex flex-col items-center gap-1 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Whisk Labs · Decision Intelligence for Food Operations</p>
            <p>Live /predict API · Heuristic forecast + AI briefing · Boston Marathon Monday, Apr 21 2026</p>
          </footer>
        </main>
      </div>
    </PredictionProvider>
  );
};

export default Index;
