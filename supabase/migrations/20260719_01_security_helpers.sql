-- =============================================================================
-- 20260719_01_security_helpers.sql
-- Phase 0 (part 1/2): helper function + role-escalation guard.
--
-- Must be applied BEFORE 20260719_02_enable_rls.sql, which depends on is_admin().
--
-- WHY is_admin() EXISTS
-- ---------------------
-- Every "is the caller an admin?" test has to read public.users. Once RLS is
-- enabled on that table, a policy that inlines
--     EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role='admin')
-- re-enters the very policy being evaluated -> infinite recursion, and Postgres
-- aborts the query. Wrapping the lookup in a SECURITY DEFINER function owned by
-- a BYPASSRLS role (postgres, the default owner for objects created in the
-- Supabase SQL editor) breaks the cycle: the function body reads the table
-- without triggering RLS.
--
-- SET search_path is mandatory here. Without it a caller who controls
-- search_path can create their own `users` table in a schema that resolves
-- first, and every admin check in the system silently returns true.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. is_admin()
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  );
$$;

comment on function public.is_admin() is
  'Returns true when the calling user has role=admin. SECURITY DEFINER so it can be used inside RLS policies on public.users without recursion.';

-- Callable by logged-in users only. anon has no legitimate reason to ask.
revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated;


-- -----------------------------------------------------------------------------
-- 2. Role-escalation guard
-- -----------------------------------------------------------------------------
-- Defence in depth. 20260719_02 restricts UPDATE on public.users to admins, so
-- under normal REST traffic a staff member cannot reach this trigger at all.
-- It still matters because RLS is bypassed by:
--   * SECURITY DEFINER functions (present and future),
--   * the service_role key (edge functions, server scripts),
--   * the table owner.
-- This trigger is the last line that keeps `role` from being written by anyone
-- who is not already an admin.
--
-- Note: RLS WITH CHECK cannot express this rule, because WITH CHECK sees only
-- the NEW row -- it has no access to OLD and therefore cannot detect a *change*.
-- A BEFORE UPDATE trigger is the only place the two rows can be compared.
-- -----------------------------------------------------------------------------
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    -- auth.uid() is NULL for service_role / direct SQL sessions. Those are
    -- trusted operator paths, so let them through; block everything else.
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'Permission denied: only an administrator may change a user role'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.prevent_role_escalation() is
  'BEFORE UPDATE guard on public.users: rejects any change to `role` unless the caller is an admin (or a trusted service_role/SQL session).';

drop trigger if exists trg_prevent_role_escalation on public.users;
create trigger trg_prevent_role_escalation
  before update on public.users
  for each row
  execute function public.prevent_role_escalation();
