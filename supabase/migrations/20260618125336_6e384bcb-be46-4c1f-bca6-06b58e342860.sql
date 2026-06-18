
-- Tighten profiles SELECT: own row, admins/managers see all
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin_or_manager(auth.uid()));

-- Tighten user_roles SELECT: own row, admins/managers see all
DROP POLICY IF EXISTS "Authenticated view roles" ON public.user_roles;
CREATE POLICY "Users view own role" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_or_manager(auth.uid()));

-- Lock down user_roles writes (no client INSERT/UPDATE/DELETE; service role only)
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated, anon;

-- Tighten activity_log SELECT: own activity, admins/managers see all
DROP POLICY IF EXISTS "Authenticated can read activity" ON public.activity_log;
CREATE POLICY "Users read own activity" ON public.activity_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_or_manager(auth.uid()));

-- Restrict SECURITY DEFINER function execution: revoke from anon/public, keep authenticated
REVOKE EXECUTE ON FUNCTION public.is_admin_or_manager(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_manager(uuid) TO authenticated;
