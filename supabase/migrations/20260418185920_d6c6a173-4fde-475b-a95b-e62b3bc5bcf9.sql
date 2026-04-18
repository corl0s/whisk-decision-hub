-- LOCATIONS
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Locations are viewable by everyone"
  ON public.locations FOR SELECT USING (true);

-- MENU ITEMS
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- e.g. 'hydration', 'bowl', 'sandwich'
  baseline_hourly_demand NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Menu items are viewable by everyone"
  ON public.menu_items FOR SELECT USING (true);
CREATE INDEX idx_menu_items_location ON public.menu_items(location_id);

-- EVENTS
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'marathon', 'game', 'concert', 'weather', 'academic'
  event_date DATE NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km NUMERIC NOT NULL DEFAULT 1.0,
  expected_attendance INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events are viewable by everyone"
  ON public.events FOR SELECT USING (true);
CREATE INDEX idx_events_date ON public.events(event_date);

-- PREDICTIONS (cached forecasts)
CREATE TABLE public.predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  shift_label TEXT NOT NULL,
  payload JSONB NOT NULL, -- full /predict response
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Predictions are viewable by everyone"
  ON public.predictions FOR SELECT USING (true);
CREATE INDEX idx_predictions_loc_date ON public.predictions(location_id, shift_date);