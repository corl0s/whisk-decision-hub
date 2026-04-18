
-- Roles
CREATE TYPE public.app_role AS ENUM ('owner', 'admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Restaurants
CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My Restaurant',
  lat double precision,
  lng double precision,
  neighborhood text,
  price_tier integer DEFAULT 2 CHECK (price_tier BETWEEN 1 AND 4),
  avg_rating numeric DEFAULT 4.0,
  seating_capacity integer DEFAULT 60,
  is_health_focused boolean DEFAULT false,
  is_fast_food boolean DEFAULT false,
  has_delivery boolean DEFAULT true,
  delivery_ratio numeric DEFAULT 0.25,
  avg_order_size numeric DEFAULT 28.0,
  dist_to_marathon_km numeric,
  dist_to_boston_center_km numeric,
  setup_complete boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id)
);
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own restaurant" ON public.restaurants FOR SELECT USING (auth.uid() = owner_user_id);
CREATE POLICY "Owners insert own restaurant" ON public.restaurants FOR INSERT WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "Owners update own restaurant" ON public.restaurants FOR UPDATE USING (auth.uid() = owner_user_id);

CREATE TRIGGER trg_restaurants_updated
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Daily predictions cache
CREATE TABLE public.daily_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  prediction_date date NOT NULL,
  predicted_covers numeric NOT NULL,
  recommended_qty integer NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, prediction_date)
);
ALTER TABLE public.daily_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own predictions"
  ON public.daily_predictions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = daily_predictions.restaurant_id AND r.owner_user_id = auth.uid()));

-- Auto-create profile + owner role + restaurant shell on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  INSERT INTO public.restaurants (owner_user_id, name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'restaurant_name', 'My Restaurant'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
