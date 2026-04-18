import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, UtensilsCrossed } from "lucide-react";
import { usePrediction } from "@/hooks/usePrediction";

// Display labels for known categories. Falls back to title-case of the raw key.
const CATEGORY_LABEL: Record<string, string> = {
  beverage: "Beverages",
  hydration: "Hydration",
  bowl: "Bowls",
  sandwich: "Sandwiches",
  salad: "Salads",
  soup: "Soups",
  bakery: "Bakery",
  breakfast: "Breakfast",
  dessert: "Desserts",
  snack: "Snacks",
};

// We don't get category back from /predict, so we infer it from the item name.
// Cheap heuristic — keeps the panel useful without a schema change.
function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (/(coffee|latte|tea|matcha|espresso|cappuccino)/.test(n)) return "beverage";
  if (/(juice|hydration|water|smoothie)/.test(n)) return "hydration";
  if (/(bowl|grain)/.test(n)) return "bowl";
  if (/(sandwich|panini|wrap|burrito)/.test(n)) return "sandwich";
  if (/(salad|kale|caesar)/.test(n)) return "salad";
  if (/(soup|chowder|broth)/.test(n)) return "soup";
  if (/(muffin|croissant|bagel|scone|bread)/.test(n)) return "bakery";
  if (/(toast|breakfast|pancake|omelet)/.test(n)) return "breakfast";
  if (/(cookie|brownie|cake|dessert)/.test(n)) return "dessert";
  if (/(bites|fruit|snack|chips|bar)/.test(n)) return "snack";
  return "other";
}

export const MenuPanel = () => {
  const { data } = usePrediction();
  const [open, setOpen] = useState(true);
  const items = data?.prepItems ?? [];

  const grouped = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const it of items) {
      const cat = inferCategory(it.name);
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(it);
    }
    return Array.from(map.entries())
      .map(([cat, list]) => ({
        cat,
        label: CATEGORY_LABEL[cat] ?? cat[0]?.toUpperCase() + cat.slice(1),
        items: [...list].sort((a, b) => b.units - a.units),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  return (
    <section className="rounded-2xl border border-border bg-card shadow-elev-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <UtensilsCrossed className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Menu Items</h3>
            <p className="text-xs text-muted-foreground">
              {items.length} items being forecasted across {grouped.length} categories
            </p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="space-y-4 border-t border-border px-5 py-4">
          {grouped.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No menu items configured.
            </div>
          )}
          {grouped.map((group) => (
            <div key={group.cat}>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </h4>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {group.items.length} {group.items.length === 1 ? "item" : "items"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((it) => {
                  const chip =
                    it.status === "critical"
                      ? "bg-danger-soft text-danger border-danger/20"
                      : it.status === "low"
                      ? "bg-muted text-muted-foreground border-border"
                      : "bg-success-soft text-success border-success/20";
                  return (
                    <div
                      key={it.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background/40 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold text-foreground">
                          {it.name}
                        </div>
                        <div className="text-[11px] font-medium text-muted-foreground">
                          {it.units} units · shift
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${chip}`}
                        title={it.note}
                      >
                        {Math.round(it.ratio * 100)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
