-- Diagnostic for the 20260719_02_enable_rls.sql apply.
--
-- ONE statement on purpose: the Supabase SQL Editor only displays the result of
-- the LAST statement when several are run together, so a multi-query script
-- silently hides everything but its final SELECT.
--
-- Run this whole file and send back the full table.
--
-- What to expect once 02 AND 05 have both been applied:
--   4  rows  kind='1_RLS'    detail='true'   (one per table)
--   12 rows  kind='2_POLICY' on users/pallets/transactions/departments, all
--            named in the new style (users_select_self_or_admin, ...)
--   3  rows  kind='2_POLICY' on system_settings -- expected, leave them alone
--
-- Danger signs:
--   detail='false' on any 1_RLS row -> RLS is off, that table is wide open
--   ANY other policy name on those four tables -> a legacy dashboard-created
--     policy. Permissive policies are OR'ed together, so a single leftover
--     "... viewable by everyone" re-opens the table no matter what else exists.
--     Add it to 20260719_05_drop_legacy_policies.sql and re-run.

select '1_RLS' as kind,
       tablename as name,
       rowsecurity::text as detail,
       '' as cmd
from pg_tables
where schemaname = 'public'
  and tablename in ('users', 'pallets', 'transactions', 'departments')

union all

select '2_POLICY' as kind,
       tablename as name,
       policyname as detail,
       cmd
from pg_policies
where schemaname = 'public'

order by kind, name, detail;
