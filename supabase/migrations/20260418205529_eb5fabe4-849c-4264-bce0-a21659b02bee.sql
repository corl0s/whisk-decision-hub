-- Add cost + CO2 columns to menu_items so the savings panel can be computed
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS cost_per_unit numeric NOT NULL DEFAULT 3.50,
  ADD COLUMN IF NOT EXISTS co2_per_unit numeric NOT NULL DEFAULT 1.20;

-- Seed sensible defaults by category (US$ avg cost-of-goods + kg CO2e per unit)
UPDATE public.menu_items SET cost_per_unit = 2.20, co2_per_unit = 0.50 WHERE category = 'beverage';
UPDATE public.menu_items SET cost_per_unit = 1.80, co2_per_unit = 0.30 WHERE category = 'hydration';
UPDATE public.menu_items SET cost_per_unit = 5.50, co2_per_unit = 2.80 WHERE category = 'bowl';
UPDATE public.menu_items SET cost_per_unit = 6.00, co2_per_unit = 3.20 WHERE category = 'sandwich';
UPDATE public.menu_items SET cost_per_unit = 4.50, co2_per_unit = 1.50 WHERE category = 'salad';
UPDATE public.menu_items SET cost_per_unit = 3.20, co2_per_unit = 1.10 WHERE category = 'soup';
UPDATE public.menu_items SET cost_per_unit = 2.50, co2_per_unit = 0.80 WHERE category = 'bakery';
UPDATE public.menu_items SET cost_per_unit = 4.80, co2_per_unit = 2.00 WHERE category = 'breakfast';
UPDATE public.menu_items SET cost_per_unit = 2.00, co2_per_unit = 0.70 WHERE category = 'dessert';
UPDATE public.menu_items SET cost_per_unit = 2.00, co2_per_unit = 0.60 WHERE category = 'snack';