
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin','manager','sales','viewer');
CREATE TYPE public.lead_status AS ENUM ('new','contacted','quotation_sent','follow_up','negotiation','won','lost');
CREATE TYPE public.lead_source AS ENUM ('website','google','referral','facebook','instagram','whatsapp','direct_call','other');
CREATE TYPE public.job_stage AS ENUM ('design_received','programming','laser_cutting','bending','welding','powder_coating','quality_check','dispatch','completed');
CREATE TYPE public.quotation_status AS ENUM ('draft','sent','approved','rejected','expired');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid()=id) WITH CHECK (auth.uid()=id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid()=id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('admin','manager'))
$$;

-- new user trigger: create profile + first user becomes admin, rest sales
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN user_count = 0 THEN 'admin'::public.app_role ELSE 'sales'::public.app_role END);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ CUSTOMERS ============
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  gst_number TEXT,
  address TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update customers" ON public.customers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin/manager delete customers" ON public.customers FOR DELETE TO authenticated USING (public.is_admin_or_manager(auth.uid()));
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ LEADS ============
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_code TEXT UNIQUE,
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  gst_number TEXT,
  requirement TEXT,
  notes TEXT,
  source public.lead_source NOT NULL DEFAULT 'website',
  status public.lead_status NOT NULL DEFAULT 'new',
  assigned_to UUID REFERENCES auth.users(id),
  estimated_value NUMERIC(12,2) DEFAULT 0,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX leads_status_idx ON public.leads(status);
CREATE INDEX leads_created_at_idx ON public.leads(created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update leads" ON public.leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin/manager delete leads" ON public.leads FOR DELETE TO authenticated USING (public.is_admin_or_manager(auth.uid()));
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- auto generate lead_code MAM-L-YYYY-#####
CREATE SEQUENCE public.leads_seq START 1;
CREATE OR REPLACE FUNCTION public.tg_lead_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.lead_code IS NULL THEN
    NEW.lead_code := 'MAM-L-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.leads_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER leads_set_code BEFORE INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.tg_lead_code();

-- ============ FOLLOW UPS ============
CREATE TABLE public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  notes TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX follow_ups_due_idx ON public.follow_ups(due_date) WHERE completed = false;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follow_ups TO authenticated;
GRANT ALL ON public.follow_ups TO service_role;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view followups" ON public.follow_ups FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert followups" ON public.follow_ups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update followups" ON public.follow_ups FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete followups" ON public.follow_ups FOR DELETE TO authenticated USING (true);
CREATE TRIGGER followups_updated_at BEFORE UPDATE ON public.follow_ups FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ QUOTATIONS ============
CREATE SEQUENCE public.quotations_seq START 1;
CREATE TABLE public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number TEXT UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_company TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_gst TEXT,
  customer_address TEXT,
  status public.quotation_status NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_pct NUMERIC(5,2) NOT NULL DEFAULT 18,
  gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  terms TEXT,
  valid_until DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT ALL ON public.quotations TO service_role;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view quotations" ON public.quotations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert quotations" ON public.quotations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update quotations" ON public.quotations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin/manager delete quotations" ON public.quotations FOR DELETE TO authenticated USING (public.is_admin_or_manager(auth.uid()));
CREATE TRIGGER quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_quotation_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.quotation_number IS NULL THEN
    NEW.quotation_number := 'MAM-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.quotations_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER quotations_set_number BEFORE INSERT ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.tg_quotation_number();

CREATE TABLE public.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  hsn_code TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'pcs',
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_items TO authenticated;
GRANT ALL ON public.quotation_items TO service_role;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage quotation items" ON public.quotation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ JOBS ============
CREATE SEQUENCE public.jobs_seq START 1;
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number TEXT UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  material TEXT,
  quantity NUMERIC(10,2) DEFAULT 1,
  deadline DATE,
  assigned_to UUID REFERENCES auth.users(id),
  stage public.job_stage NOT NULL DEFAULT 'design_received',
  notes TEXT,
  value NUMERIC(12,2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX jobs_stage_idx ON public.jobs(stage);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view jobs" ON public.jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update jobs" ON public.jobs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin/manager delete jobs" ON public.jobs FOR DELETE TO authenticated USING (public.is_admin_or_manager(auth.uid()));
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_job_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.job_number IS NULL THEN
    NEW.job_number := 'MAM-J-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.jobs_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER jobs_set_number BEFORE INSERT ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.tg_job_number();
