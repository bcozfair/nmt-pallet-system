-- Function to delete a user from auth.users (and cascade to public.users)
-- Run this in your Supabase SQL Editor

create or replace function delete_user_complete(target_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Check if the executing user is an admin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Access denied: Only admins can delete users';
  end if;

  -- Delete from public.users first (if foreign keys don't mess it up, but usually cascade handles it)
  -- If you have strict non-cascading FKs, handle them here.
  -- Assuming ON DELETE CASCADE is NOT set on everything, manual delete is safer.
  delete from public.users where id = target_user_id;
  
  -- Delete from auth.users
  delete from auth.users where id = target_user_id;
end;
$$;
