import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ChefHat } from "lucide-react";

const NEIGHBORHOODS = ["Allston", "Back Bay", "Brookline", "Cambridge", "Fenway", "Jamaica Plain", "Kenmore", "North End", "Seaport", "South End"];

const NEIGHBORHOOD_COORDS: Record<string, { lat: number; lng: number }> = {
  "Allston": { lat: 42.3534, lng: -71.1320 },
  "Back Bay": { lat: 42.3503, lng: -71.0810 },
  "Brookline": { lat: 42.3318, lng: -71.1212 },
  "Cambridge": { lat: 42.3736, lng: -71.1097 },
  "Fenway": { lat: 42.3467, lng: -71.0972 },
  "Jamaica Plain": { lat: 42.3097, lng: -71.1147 },
  "Kenmore": { lat: 42.3489, lng: -71.0958 },
  "North End": { lat: 42.3647, lng: -71.0542 },
  "Seaport": { lat: 42.3519, lng: -71.0444 },
  "South End": { lat: 42.3388, lng: -71.0765 },
};

export default function RestaurantSetup() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "", neighborhood: "Cambridge",
    seating_capacity: 60, price_tier: 2, avg_rating: 4.0,
    is_health_focused: false, is_fast_food: false, has_delivery: true,
    delivery_ratio: 0.25, avg_order_size: 28,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { nav("/auth"); return; }
    supabase.from("restaurants").select("*").eq("owner_user_id", user.id).single().then(({ data }) => {
      if (data) {
        setForm({
          name: data.name ?? "",
          neighborhood: data.neighborhood ?? "Cambridge",
          seating_capacity: data.seating_capacity ?? 60,
          price_tier: data.price_tier ?? 2,
          avg_rating: Number(data.avg_rating ?? 4.0),
          is_health_focused: !!data.is_health_focused,
          is_fast_food: !!data.is_fast_food,
          has_delivery: data.has_delivery ?? true,
          delivery_ratio: Number(data.delivery_ratio ?? 0.25),
          avg_order_size: Number(data.avg_order_size ?? 28),
        });
      }
      setLoading(false);
    });
  }, [user, authLoading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const coords = NEIGHBORHOOD_COORDS[form.neighborhood];
      const { error } = await supabase.from("restaurants").update({
        ...form,
        lat: coords.lat, lng: coords.lng,
        setup_complete: true,
      }).eq("owner_user_id", user.id);
      if (error) throw error;
      toast({ title: "Saved", description: "Loading today's plan…" });
      nav("/");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (loading || authLoading) return <div className="p-8">Loading…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/40 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center">
            <ChefHat className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Restaurant profile</h1>
            <p className="text-sm text-muted-foreground">Used by the model to predict daily demand.</p>
          </div>
        </div>
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Restaurant name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <Label>Neighborhood</Label>
                <Select value={form.neighborhood} onValueChange={(v) => setForm({ ...form, neighborhood: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NEIGHBORHOODS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Seating capacity</Label>
                <Input type="number" min={10} max={500} value={form.seating_capacity}
                  onChange={(e) => setForm({ ...form, seating_capacity: parseInt(e.target.value) })} />
              </div>
              <div>
                <Label>Price tier (1=$, 4=$$$$)</Label>
                <Input type="number" min={1} max={4} value={form.price_tier}
                  onChange={(e) => setForm({ ...form, price_tier: parseInt(e.target.value) })} />
              </div>
              <div>
                <Label>Average rating (0-5)</Label>
                <Input type="number" step="0.1" min={0} max={5} value={form.avg_rating}
                  onChange={(e) => setForm({ ...form, avg_rating: parseFloat(e.target.value) })} />
              </div>
              <div>
                <Label>Average order size ($)</Label>
                <Input type="number" step="0.5" min={1} value={form.avg_order_size}
                  onChange={(e) => setForm({ ...form, avg_order_size: parseFloat(e.target.value) })} />
              </div>
              <div>
                <Label>Delivery share of orders (0-1)</Label>
                <Input type="number" step="0.05" min={0} max={1} value={form.delivery_ratio}
                  onChange={(e) => setForm({ ...form, delivery_ratio: parseFloat(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label>Health-focused menu</Label>
                <Switch checked={form.is_health_focused} onCheckedChange={(v) => setForm({ ...form, is_health_focused: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Fast-food format</Label>
                <Switch checked={form.is_fast_food} onCheckedChange={(v) => setForm({ ...form, is_fast_food: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Offers delivery</Label>
                <Switch checked={form.has_delivery} onCheckedChange={(v) => setForm({ ...form, has_delivery: v })} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Saving…" : "Save & view today's plan"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
