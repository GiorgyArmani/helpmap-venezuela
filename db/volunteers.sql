-- Volunteer role + RLS — run ONCE in the Supabase SQL editor.
--
-- Extends the existing admin_users / is_admin() model (see CLAUDE.md §9, §14):
--   • admin_users.role may now be 'admin' | 'verifier' | 'volunteer'
--   • is_staff() = admin OR volunteer
--   • volunteers can SELECT-for-edit / INSERT / UPDATE patients; DELETE stays admin-only
--   • locations stay admin-only (no change)
--
-- These staff policies are PERMISSIVE and OR-combined with the existing admin-only
-- policy, so admins keep full access and volunteers gain edit access without delete.
-- Idempotent: safe to re-run.

-- 1) Allow the 'volunteer' role. If admin_users.role has a CHECK constraint limiting
--    its values, widen it. (Adjust the constraint name if yours differs — list with:
--    select conname from pg_constraint where conrelid = 'public.admin_users'::regclass;)
alter table public.admin_users drop constraint if exists admin_users_role_check;
alter table public.admin_users
  add constraint admin_users_role_check check (role in ('admin', 'verifier', 'volunteer'));

-- 2) is_staff(): true when the current user is an admin OR a volunteer.
create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and role in ('admin', 'volunteer')
  );
$$;

-- 3) Patient edit access for staff (admin OR volunteer). DELETE is intentionally
--    NOT granted to staff — only the pre-existing admin policy can delete.
drop policy if exists patients_staff_select on public.patients;
drop policy if exists patients_staff_insert on public.patients;
drop policy if exists patients_staff_update on public.patients;

create policy patients_staff_select on public.patients
  for select to authenticated using (public.is_staff());

create policy patients_staff_insert on public.patients
  for insert to authenticated with check (public.is_staff());

create policy patients_staff_update on public.patients
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- Note: public reads still go through the privacy-filtered `patients_public` view with
-- the anon key — unaffected by these authenticated-only policies. The minor-privacy
-- trigger and the client-side protectMinor() guard remain in force regardless.
