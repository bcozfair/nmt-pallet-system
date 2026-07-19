-- =============================================================================
-- 20260719_99_ROLLBACK.sql
--
-- EMERGENCY USE ONLY. Run this if applying 20260719_02 locks the application
-- out and you need the app working again while the policies are debugged.
--
-- This DISABLES row level security and puts the database back into the state
-- described in the audit: every table readable and writable with the anon key
-- that ships in the public JS bundle. Do not leave the system here.
--
-- It deliberately does NOT roll back 20260719_03 (the RPC fixes). Those are
-- pure hardening -- an authorization check, a hardcoded 'staff' role, fixed
-- search_paths, revoked anon grants -- and none of them can lock you out.
-- The one behaviour change there is delete_user_complete() refusing to delete
-- users who have transaction history; if that specific refusal is blocking you,
-- fix it in place rather than reverting the whole file.
-- =============================================================================

begin;

alter table public.users        disable row level security;
alter table public.pallets      disable row level security;
alter table public.transactions disable row level security;
alter table public.departments  disable row level security;

commit;


-- -----------------------------------------------------------------------------
-- Storage rollback (only if 20260719_04 was applied and evidence images broke)
-- -----------------------------------------------------------------------------
-- begin;
--
-- update storage.buckets set public = true where id = 'damage_reports';
--
-- drop policy if exists "damage_reports_select_authenticated" on storage.objects;
-- drop policy if exists "damage_reports_delete_admin"         on storage.objects;
--
-- create policy "Public can view damage reports"
--   on storage.objects for select
--   to public
--   using (bucket_id = 'damage_reports');
--
-- create policy "Authenticated users can delete damage reports"
--   on storage.objects for delete
--   to authenticated
--   using (bucket_id = 'damage_reports');
--
-- commit;
-- -----------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- MOST LIKELY CAUSE IF THE APP BREAKS AFTER 20260719_02
-- -----------------------------------------------------------------------------
-- 1. "infinite recursion detected in policy for relation users"
--    -> is_admin() is not SECURITY DEFINER, or its owner lacks BYPASSRLS.
--       Check:  select proname, prosecdef from pg_proc where proname = 'is_admin';
--       prosecdef must be true. Re-run 20260719_01.
--
-- 2. Admin screens return empty lists, no error.
--    -> The signed-in account's public.users row does not have role = 'admin'.
--       Check:  select id, employee_id, role from public.users;
--       Fix:    update public.users set role = 'admin' where employee_id = '<yours>';
--       (Run that as the SQL editor / service_role, which bypasses RLS and the
--        prevent_role_escalation trigger's auth.uid() check.)
--
-- 3. Mobile check-out fails with a permissions error on pallets.
--    -> services/transactionService.ts is still calling .upsert(). It must use
--       .update(); pallet INSERT is admin-only by design now.
--
-- 4. Staff cannot see their own history.
--    -> transactions rows have user_id values that do not match auth.uid().
--       Check:  select distinct user_id from public.transactions;
-- -----------------------------------------------------------------------------
