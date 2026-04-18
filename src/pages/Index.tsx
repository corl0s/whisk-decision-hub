import { useState } from "react";
import { Header } from "@/components/whisk/Header";
import { KitchenView } from "@/components/whisk/KitchenView";
import { ManagerView } from "@/components/whisk/ManagerView";
import { IntelligenceSidebar } from "@/components/whisk/IntelligenceSidebar";

type View = "kitchen" | "manager";

const Index = () => {
  const [view, setView] = useState<View>("kitchen");

  return (
    <div className="min-h-screen bg-background">
      <Header view={view} onViewChange={setView} />

      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div key={view} className="min-w-0">
            {view === "kitchen" ? <KitchenView /> : <ManagerView />}
          </div>
          <IntelligenceSidebar />
        </div>

        <footer className="mt-10 flex flex-col items-center gap-1 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Whisk Labs · Decision Intelligence for Food Operations</p>
          <p>Demo scenario · Data mirrors live /predict API schema · Boston Marathon Monday, Apr 21 2026</p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
