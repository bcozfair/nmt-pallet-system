
-- Enable RLS on departments
alter table "public"."departments" enable row level security;

-- Allow everything for authenticated users (Simple policy for internal app)
create policy "Allow all access to departments for authenticated users"
on "public"."departments"
for all
to authenticated
using (true)
with check (true);
