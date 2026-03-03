-- Enable Realtime for users table
begin;
  -- Add users table to the publication
  alter publication supabase_realtime add table users;
  
  -- Verify
  select * from pg_publication_tables where pubname = 'supabase_realtime';
commit;
