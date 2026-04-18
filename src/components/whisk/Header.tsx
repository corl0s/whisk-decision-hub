import { ChefHat, LineChart, Activity, CloudSun, GraduationCap, Trophy } from "lucide-react";
import { ShiftDatePicker } from "./ShiftDatePicker";

type View = "kitchen" | "manager";

interface HeaderProps {
  view: View;
  onViewChange: (v: View) => void;
}

const SignalBadge = ({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "default" | "success" | "accent";
}) => {
  const toneClasses =
    tone === "success"
      ? "bg-success-soft text-success border-success/20"
      : tone === "accent"
      ? "bg-accent/10 text-accent border-accent/20"
      : "bg-secondary text-secondary-foreground border-border";
  return (
    <div className={`hidden md:flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${toneClasses}`}>
      <Icon className="h-3.5 w-3.5" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
};

export const Header = ({ view, onViewChange }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 md:px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-elev-md">
            <ChefHat className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight text-foreground">Whisk Labs</div>
            <div className="text-[11px] font-medium text-muted-foreground">Decision Intelligence</div>
          </div>
          <div className="ml-3 flex items-center gap-1.5 rounded-full border border-success/20 bg-success-soft px-2.5 py-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-live live-pulse" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-live" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-success">Live</span>
          </div>
        </div>

        {/* Active signals + date picker */}
        <div className="flex items-center gap-2">
          <SignalBadge icon={Trophy} label="Event" value="Boston Marathon" tone="accent" />
          <SignalBadge icon={CloudSun} label="Weather" value="Clear 58°F" />
          <SignalBadge icon={GraduationCap} label="Academic" value="Semester Active" />
          <ShiftDatePicker />
        </div>

        {/* Persona toggle */}
        <div className="flex items-center gap-1 rounded-full border border-border bg-muted/60 p-1">
          <button
            onClick={() => onViewChange("kitchen")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all md:text-sm ${
              view === "kitchen"
                ? "bg-card text-foreground shadow-elev-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            Kitchen View
          </button>
          <button
            onClick={() => onViewChange("manager")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all md:text-sm ${
              view === "manager"
                ? "bg-card text-foreground shadow-elev-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LineChart className="h-3.5 w-3.5" />
            Manager View
          </button>
        </div>
      </div>
    </header>
  );
};
