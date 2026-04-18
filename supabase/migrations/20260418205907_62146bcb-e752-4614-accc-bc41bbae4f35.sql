-- Inventory levels: one row per menu item, tracks on-hand stock + par level
CREATE TABLE public.inventory_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  current_stock numeric NOT NULL DEFAULT 0,
  par_level numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'units',
  last_counted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (menu_item_id)
);

ALTER TABLE public.inventory_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventory levels are viewable by everyone"
  ON public.inventory_levels FOR SELECT
  USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_inventory_levels_updated
BEFORE UPDATE ON public.inventory_levels
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed: par_level = baseline_hourly_demand × 6 hours of cover
-- current_stock = par × random(0.6 - 1.4) so we get a realistic mix
INSERT INTO public.inventory_levels (menu_item_id, current_stock, par_level, unit, last_counted_at)
SELECT
  m.id,
  ROUND(m.baseline_hourly_demand * 6 * (0.6 + random() * 0.8))::numeric,
  ROUND(m.baseline_hourly_demand * 6)::numeric,
  CASE
    WHEN m.category IN ('beverage','hydration') THEN 'cups'
    WHEN m.category IN ('soup') THEN 'bowls'
    ELSE 'units'
  END,
  now() - (random() * interval '8 hours')
FROM public.menu_items m;

CREATE INDEX idx_inventory_levels_menu_item ON public.inventory_levels(menu_item_id);