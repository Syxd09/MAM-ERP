
-- Pin search_path on trigger functions
ALTER FUNCTION public.tg_job_number() SET search_path = public;
ALTER FUNCTION public.tg_set_updated_at() SET search_path = public;
ALTER FUNCTION public.tg_lead_code() SET search_path = public;
ALTER FUNCTION public.tg_quotation_number() SET search_path = public;

-- Replace USING/WITH CHECK (true) write policies with explicit auth checks
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public' AND policyname IN (
      'auth insert leads','auth update leads',
      'auth insert followups','auth update followups','auth delete followups',
      'auth insert customers','auth update customers',
      'auth insert quotations','auth update quotations',
      'auth insert jobs','auth update jobs',
      'auth manage quotation items'
    )
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

CREATE POLICY "auth insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update leads" ON public.leads FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth insert followups" ON public.follow_ups FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update followups" ON public.follow_ups FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth delete followups" ON public.follow_ups FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update customers" ON public.customers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth insert quotations" ON public.quotations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update quotations" ON public.quotations FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth insert jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update jobs" ON public.jobs FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth manage quotation items" ON public.quotation_items FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
