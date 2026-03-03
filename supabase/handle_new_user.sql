-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, full_name, role, department, employee_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'No Name'), 
    coalesce(new.raw_user_meta_data->>'role', 'staff'),
    coalesce(new.raw_user_meta_data->>'department', '-'),
    coalesce(new.raw_user_meta_data->>'employee_id', '-')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on new user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
