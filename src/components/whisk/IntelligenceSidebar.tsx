import { Calculator, MapPin } from "lucide-react";
import { useState } from "react";
import { usePrediction } from "@/hooks/usePrediction";
import { DriverCards } from "./DriverCards";

export const IntelligenceSidebar = () => {
  const [locations, setLocations] = useState(20);
  const { data } = usePrediction();
  const monthlySavings = data?.savings.projectedMonthly ?? 2800;
  const annualPerLocation = monthlySavings * 12;
  const total = locations * annualPerLocation;

  return (
    <aside className="space-y-5">
      <DriverCards />

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elev-sm">
        <div className="relative h-32 bg-gradient-to-br from-primary-glow/20 via-accent/10 to-success/10">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 130" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="300" height="130" fill="url(#grid)" />
            <path d="M 0 75 L 300 70" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round" opacity="0.85" />
            <path d="M 0 75 L 300 70" stroke="hsl(var(--accent))" strokeWidth="1.5" strokeDasharray="6 6" />
            <rect x="210" y="60" width="4" height="20" fill="hsl(var(--foreground))" />
            <text x="218" y="58" fontSize="9" fontWeight="700" fill="hsl(var(--foreground))">FINISH</text>
            <circle cx="135" cy="72" r="9" fill="hsl(var(--danger))" stroke="hsl(var(--card))" strokeWidth="2.5" />
            <circle cx="135" cy="72" r="3" fill="hsl(var(--card))" />
          </svg>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <MapPin className="h-4 w-4 text-danger" />
            Boylston St Location
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {data?.scenario.signals.event.distanceKm ?? 0.8} km from the Marathon finish line. Streets closed to vehicle delivery 7am–6pm.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-elev-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success-soft">
            <Calculator className="h-3.5 w-3.5 text-success" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Waste Calculator</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Estimate impact at scale.</p>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Locations</span>
            <span className="rounded-md bg-muted px-2 py-0.5 font-bold text-foreground">{locations}</span>
          </div>
          <input type="range" min={1} max={100} value={locations} onChange={(e) => setLocations(Number(e.target.value))} className="mt-2 w-full accent-[hsl(var(--success))]" />
        </div>

        <div className="mt-4 rounded-xl bg-success-soft p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-success/80">Annual loss prevented</div>
          <div className="mt-1 text-3xl font-bold tracking-tight text-success">${total.toLocaleString()}</div>
          <p className="mt-1 text-[11px] font-medium text-success/80">
            For a {locations}-location chain at ${annualPerLocation.toLocaleString()}/yr each.
          </p>
        </div>
      </div>
    </aside>
  );
};
