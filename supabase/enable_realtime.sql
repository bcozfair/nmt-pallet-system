-- Run this in your Supabase SQL Editor to enable Realtime updates

begin;
  -- Remove if already exists to avoid errors (optional, but safe)
  -- drop publication if exists supabase_realtime; 
  -- (Usually supabase_realtime exists by default, we just add tables to it)

  -- Add tables to the publication
  alter publication supabase_realtime add table pallets;
  alter publication supabase_realtime add table transactions;

  -- Verify it worked
  select * from pg_publication_tables where pubname = 'supabase_realtime';
commit;
