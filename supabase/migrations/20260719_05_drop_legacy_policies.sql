-- =============================================================================
-- 20260719_05_drop_legacy_policies.sql
-- Follow-up to 20260719_02_enable_rls.sql.
--
-- WHY THIS FILE EXISTS
-- --------------------
-- 02 applied cleanly: RLS is on for all four tables and all 12 new policies
-- exist. The tables were still fully readable with the anon key afterwards
-- because the database also carries policies that were created through the
-- Supabase dashboard and appear in NO .sql file in this repository. 02 could
-- only drop the names it knew about, which came from the repo's hotfix files.
--
-- Postgres combines permissive policies with OR. One policy of
-- `FOR SELECT TO public USING (true)` therefore defeats every restrictive
-- policy sitting next to it. The new rules were never in force.
--
-- The names below were read out of pg_policies on the live database on
-- 2026-07-19, so this file is specific to this project and not portable.
--
-- system_settings is deliberately NOT touched. Its "Allow public read access"
-- policy is the hardened version from secure_system_settings.sql
-- (USING (is_secret = false)) -- verified live: an anon SELECT returns the 7
-- non-secret keys and correctly hides line_channel_token / line_target_id.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- users -- the most serious of the four
-- -----------------------------------------------------------------------------
-- The two SELECT policies granted the entire user table, role column included,
-- to unauthenticated callers.
drop policy if exists "Public profiles are viewable by everyone" on public.users;
drop policy if exists "Enable read access for all users"         on public.users;

-- Self-service UPDATE on your own row means self-service role change. The
-- prevent_role_escalation trigger from 01 would have caught the role column
-- specifically, but there is no reason to allow the write at all: nothing in
-- the app lets a user edit their own profile. Profile edits are an admin action
-- (UserView), covered by users_update_admin_only.
drop policy if exists "Users can update own profile"    on public.users;
drop policy if exists "Users can update their own data" on public.users;

-- Superseded by users_update_admin_only. Dropped as well because dashboard
-- admin checks are typically written as an inline subquery against
-- public.users, which now recurses through that table's own RLS -- exactly what
-- is_admin() exists to avoid.
drop policy if exists "Admins can update all user data" on public.users;

-- Rows are created by the handle_new_user trigger and removed by
-- delete_user_complete(). Both are SECURITY DEFINER and bypass RLS, so neither
-- needs a policy; leaving these in place only widens the surface.
drop policy if exists "Users can insert own profile" on public.users;
drop policy if exists "Admins can delete users"      on public.users;


-- -----------------------------------------------------------------------------
-- pallets
-- -----------------------------------------------------------------------------
drop policy if exists "Pallets are viewable by everyone"     on public.pallets;
drop policy if exists "Pallets are modifiable by authenticated" on public.pallets;


-- -----------------------------------------------------------------------------
-- transactions
-- -----------------------------------------------------------------------------
drop policy if exists "Transactions are viewable by everyone"   on public.transactions;
drop policy if exists "Transactions are insertable by authenticated" on public.transactions;

-- These two are from fix_permissions.sql (USING (true) for every authenticated
-- user). 02 tried to drop them but guessed at slightly different names.
drop policy if exists "Enable update for authenticated users on transactions" on public.transactions;
drop policy if exists "Enable delete for authenticated users on transactions" on public.transactions;


-- -----------------------------------------------------------------------------
-- departments
-- -----------------------------------------------------------------------------
drop policy if exists "Departments are viewable by everyone"     on public.departments;
drop policy if exists "Departments are insertable by authenticated" on public.departments;
drop policy if exists "Departments are updatable by authenticated" on public.departments;
drop policy if exists "Allow all access to departments for authenticated users" on public.departments;

commit;

-- -----------------------------------------------------------------------------
-- After running this, re-run DIAGNOSE.sql. The 2_POLICY rows for users,
-- pallets, transactions and departments should contain ONLY these 12 names:
--
--   departments_select_authenticated     departments_write_admin
--   pallets_select_authenticated         pallets_update_authenticated
--   pallets_insert_admin                 pallets_delete_admin
--   transactions_select_own_or_admin     transactions_insert_self
--   transactions_update_admin            transactions_delete_admin
--   users_select_self_or_admin           users_update_admin_only
--
-- (That is 12 lines listing 12 policies -- 2 + 4 + 4 + 2.)
--
-- Anything else on those four tables is a leftover and should be dropped too.
-- system_settings keeps its own three policies; that is expected.
-- -----------------------------------------------------------------------------
