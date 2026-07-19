-- =============================================================================
-- 20260719_02_enable_rls.sql
-- Phase 0 (part 2/2): enable RLS and install policies on the four core tables.
--
-- Requires 20260719_01_security_helpers.sql (provides public.is_admin()).
--
-- WHAT THIS FIXES
-- ---------------
-- Verified against the live project on 2026-07-19 with nothing but the anon key
-- that ships inside the deployed JS bundle:
--     GET   /rest/v1/users            -> 200, all rows
--     GET   /rest/v1/pallets          -> 200, all rows
--     GET   /rest/v1/transactions     -> 200, all rows
--     GET   /rest/v1/departments      -> 200, all rows
--     PATCH /rest/v1/users   {"role":"admin"}  -> 204 (write accepted)
--     PATCH /rest/v1/pallets {"status":...}    -> 204 (write accepted)
-- The two PATCH probes used a WHERE clause matching zero rows, so no data was
-- modified -- but a matching WHERE would have been accepted just the same.
-- Anyone able to open DevTools on the deployed site could make themselves an
-- administrator with a single request.
--
-- ORDER MATTERS: policies are created first, RLS is switched on last, and the
-- whole file runs in one transaction. If anything raises, nothing is applied
-- and the database is left exactly as it was.
--
-- system_settings is deliberately untouched: secure_system_settings.sql is
-- already applied and working (the is_secret filter correctly hides
-- line_channel_token / line_target_id from anon). Do not "fix" it again.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
-- INSERT: no policy. Rows are created exclusively by the handle_new_user
--         trigger, which is SECURITY DEFINER and bypasses RLS.
-- DELETE: no policy. Deletion goes through delete_user_complete() only.
-- No policy == denied, which is the intent for both.
drop policy if exists "users_select_self_or_admin" on public.users;
create policy "users_select_self_or_admin"
  on public.users for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "users_update_admin_only" on public.users;
create policy "users_update_admin_only"
  on public.users for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.users enable row level security;


-- -----------------------------------------------------------------------------
-- pallets
-- -----------------------------------------------------------------------------
-- Staff must be able to flip status/location when scanning, but they must not
-- be able to invent or destroy inventory.
--
-- INSERT is admin-only, which means checkOutPallet() can no longer rely on
-- upsert -- see the matching change in services/transactionService.ts. That is
-- an intentional tightening: the old upsert meant scanning any unrecognised QR
-- code silently created a pallet record.
drop policy if exists "pallets_select_authenticated" on public.pallets;
create policy "pallets_select_authenticated"
  on public.pallets for select
  to authenticated
  using (true);

drop policy if exists "pallets_update_authenticated" on public.pallets;
create policy "pallets_update_authenticated"
  on public.pallets for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "pallets_insert_admin" on public.pallets;
create policy "pallets_insert_admin"
  on public.pallets for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "pallets_delete_admin" on public.pallets;
create policy "pallets_delete_admin"
  on public.pallets for delete
  to authenticated
  using (public.is_admin());

alter table public.pallets enable row level security;


-- -----------------------------------------------------------------------------
-- transactions  (the audit trail)
-- -----------------------------------------------------------------------------
-- Previously: fix_permissions.sql granted INSERT/UPDATE/DELETE to every
-- authenticated user with USING (true) -- any staff member could rewrite or
-- delete anyone else's history, which defeats the point of having an audit log.
--
-- SELECT is own-rows-or-admin. This is sufficient for every current screen:
-- MobileHistory only ever queries the signed-in user's own id, and all
-- cross-user views (dashboard, transaction table, CSV export) are admin-only.
drop policy if exists "transactions_select_own_or_admin" on public.transactions;
create policy "transactions_select_own_or_admin"
  on public.transactions for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- A user may only write history entries attributed to themselves. Blocks
-- forging a transaction under another employee's name.
drop policy if exists "transactions_insert_self" on public.transactions;
create policy "transactions_insert_self"
  on public.transactions for insert
  to authenticated
  with check (user_id = auth.uid());

-- Editing and purging history is an administrative act:
-- TransactionEditModal, deleteTransaction(), cleanupOldData(), and the
-- evidence_image_url -> 'image_deleted' write inside resolveDamage().
drop policy if exists "transactions_update_admin" on public.transactions;
create policy "transactions_update_admin"
  on public.transactions for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "transactions_delete_admin" on public.transactions;
create policy "transactions_delete_admin"
  on public.transactions for delete
  to authenticated
  using (public.is_admin());

alter table public.transactions enable row level security;


-- -----------------------------------------------------------------------------
-- departments
-- -----------------------------------------------------------------------------
-- Replaces fix_departments_policy.sql's FOR ALL / USING (true), under which any
-- staff member could rename or delete every department in the system.
drop policy if exists "Allow all access to authenticated users" on public.departments;
drop policy if exists "departments_select_authenticated" on public.departments;
create policy "departments_select_authenticated"
  on public.departments for select
  to authenticated
  using (true);

drop policy if exists "departments_write_admin" on public.departments;
create policy "departments_write_admin"
  on public.departments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.departments enable row level security;


-- -----------------------------------------------------------------------------
-- Superseded policies from the ad-hoc hotfix files.
-- Left in place they would OR together with the rules above and re-open
-- exactly what this migration closes.
-- -----------------------------------------------------------------------------
drop policy if exists "Allow authenticated insert" on public.transactions;
drop policy if exists "Allow authenticated update" on public.transactions;
drop policy if exists "Allow authenticated delete" on public.transactions;
drop policy if exists "Enable insert for authenticated users" on public.transactions;
drop policy if exists "Enable update for authenticated users" on public.transactions;
drop policy if exists "Enable delete for authenticated users" on public.transactions;

commit;

-- -----------------------------------------------------------------------------
-- Post-apply verification (run separately, expect zero rows):
--
--   select tablename
--   from pg_tables
--   where schemaname = 'public'
--     and tablename in ('users','pallets','transactions','departments')
--     and not rowsecurity;
--
-- Then re-run the anon probe from outside; every table must now return 0 rows
-- (or 401/403) instead of the full contents.
-- -----------------------------------------------------------------------------
