import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChefHat, RefreshCw, LogOut, Settings, TrendingUp, Cloud, Calendar, Users } from "lucide-react";

interface Prediction {
  date: string;
  predictedCovers: number;
  recommendedQty: number;
  drivers: Array<{ feature: string; key: string; splits: number; value: number }>;
  menuSplit: Array<{ name: string; category: string; qty: number }>;
  context: {
    weather: { temp_avg: number; precip_mm_sum: number; is_rainy_day: number };
    events: { within5: number; attendanceSum: number; hasMajor: boolean };
    academic: { active: number; activityIndex: number };
  };
  model: { version: string; trees: number; feature_count: number };
}

export default function Dashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [pred, setPred] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const runPrediction = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("predict-quantity", {
        body: { date: today },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPred(data as Prediction);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { nav("/auth"); return; }
    (async () => {
      const { data: r } = await supabase.from("restaurants").select("*").eq("owner_user_id", user.id).single();
      if (!r || !r.setup_complete) { nav("/setup"); return; }
      setRestaurant(r);
      setLoading(false);
      // Trigger prediction
      const { data, error } = await supabase.functions.invoke("predict-quantity", { body: { date: today } });
      if (error) setError(error.message);
      else if (data?.error) setError(data.error);
      else setPred(data as Prediction);
    })();
  }, [user, authLoading, nav, today]);

  if (loading || authLoading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;

  const dateLabel = new Date(today + "T12:00:00Z").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center">
              <ChefHat className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-bold">{restaurant?.name}</div>
              <div className="text-xs text-muted-foreground">{restaurant?.neighborhood} · {dateLabel}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => nav("/setup")}><Settings className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => signOut().then(() => nav("/auth"))}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {error && (
          <Card className="p-4 border-danger/30 bg-danger-soft text-danger text-sm">
            {error}
          </Card>
        )}

        {/* Hero prediction */}
        <Card className="p-6 md:p-8 bg-gradient-primary text-primary-foreground shadow-elev-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="text-xs font-bold uppercase tracking-wider opacity-80">Today's Production Plan</div>
              <div className="mt-3 flex items-baseline gap-3">
                <div className="text-6xl md:text-7xl font-bold tracking-tight tabular-nums">
                  {pred ? pred.recommendedQty : "—"}
                </div>
                <div className="text-lg opacity-90">covers</div>
              </div>
              <div className="mt-2 text-sm opacity-80">
                {pred ? `Make food for approximately ${pred.recommendedQty} guests today` : "Calculating…"}
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={runPrediction} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
          {pred && (
            <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg bg-primary-foreground/10 px-3 py-2">
                <div className="opacity-70">Model</div>
                <div className="font-bold">LightGBM · {pred.model.trees} trees</div>
              </div>
              <div className="rounded-lg bg-primary-foreground/10 px-3 py-2">
                <div className="opacity-70">Features used</div>
                <div className="font-bold">{pred.model.feature_count}</div>
              </div>
              <div className="rounded-lg bg-primary-foreground/10 px-3 py-2">
                <div className="opacity-70">Confidence</div>
                <div className="font-bold">±{Math.round(pred.recommendedQty * 0.12)} covers</div>
              </div>
            </div>
          )}
        </Card>

        {pred && (
          <>
            {/* Context strip */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Cloud className="h-4 w-4" /> Weather
                </div>
                <div className="mt-2 text-2xl font-bold">{Math.round(pred.context.weather.temp_avg * 9 / 5 + 32)}°F</div>
                <div className="text-xs text-muted-foreground">
                  {pred.context.weather.is_rainy_day ? `Rain ${pred.context.weather.precip_mm_sum.toFixed(1)}mm` : "Dry day"}
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Users className="h-4 w-4" /> Nearby Events
                </div>
                <div className="mt-2 text-2xl font-bold">{pred.context.events.within5}</div>
                <div className="text-xs text-muted-foreground">
                  {pred.context.events.attendanceSum > 0 ? `${pred.context.events.attendanceSum.toLocaleString()} expected attendees` : "No major crowds"}
                  {pred.context.events.hasMajor && <Badge className="ml-2 bg-accent text-accent-foreground">Major</Badge>}
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Calendar className="h-4 w-4" /> Academic
                </div>
                <div className="mt-2 text-2xl font-bold">{pred.context.academic.active}</div>
                <div className="text-xs text-muted-foreground">universities in session</div>
              </Card>
            </div>

            {/* Menu split + drivers */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-5">
                <h3 className="text-sm font-bold mb-4">Recommended quantities by menu item</h3>
                <p className="text-xs text-muted-foreground mb-3">Proportional to each item's typical share of demand.</p>
                <div className="space-y-2">
                  {pred.menuSplit.length === 0 && <div className="text-xs text-muted-foreground">No menu items configured.</div>}
                  {pred.menuSplit.map(m => (
                    <div key={m.name} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                      <div>
                        <div className="text-sm font-medium">{m.name}</div>
                        <div className="text-xs text-muted-foreground">{m.category}</div>
                      </div>
                      <div className="text-lg font-bold tabular-nums">{m.qty}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> What's driving today's number</h3>
                <p className="text-xs text-muted-foreground mb-3">Top features the model used most across its decision trees.</p>
                <div className="space-y-2">
                  {pred.drivers.map(d => (
                    <div key={d.key} className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{d.feature}</div>
                        <div className="h-1.5 mt-1 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${(d.splits / pred.drivers[0].splits) * 100}%` }} />
                        </div>
                      </div>
                      <div className="text-xs tabular-nums text-muted-foreground w-16 text-right">
                        {typeof d.value === "number" ? d.value.toFixed(1) : d.value}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
