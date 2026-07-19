-- Health check: is row level security still in the state 00_current_schema.sql
-- defines? Run this after touching policies, or after adding anything through
-- the Supabase dashboard.
--
-- ONE statement on purpose: the Supabase SQL Editor only displays the result of
-- the LAST statement when several are run together, so a multi-query script
-- silently hides everything but its final SELECT.
--
-- Expected:
--   5  rows  kind='1_RLS'    detail='true'  (users, pallets, transactions,
--                                            departments, system_settings)
--   12 rows  kind='2_POLICY' on users/pallets/transactions/departments, all
--            named in the schema's style (users_select_self_or_admin, ...)
--   3  rows  kind='2_POLICY' on system_settings ("Allow public read access",
--            "Allow admin update", "Allow admin insert") -- expected
--
-- Danger signs:
--   detail='false' on any 1_RLS row -> RLS is off, that table is wide open
--   ANY policy name outside the list above -> most likely created through the
--     dashboard. Permissive policies are OR'ed together, so one leftover
--     "... viewable by everyone" re-opens the table regardless of what else is
--     defined. Drop it, and add it to 00_current_schema.sql if it belongs.
--
-- Configuration looking right is not proof. Confirm with an external probe
-- using only the anon key -- see README_SECURITY_FIX.md.

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
