-- Allow DELETE on damage_reports bucket
-- (The previous setup_storage.sql missed the DELETE policy)
create policy "Authenticated users can delete damage reports"
on storage.objects for delete
to authenticated
using ( bucket_id = 'damage_reports' );

-- Allow UPDATE on transactions table
-- (Required for updating evidence_image_url to 'image_deleted')
alter table "public"."transactions" enable row level security;

create policy "Enable update for authenticated users on transactions"
on "public"."transactions"
for update
to authenticated
using (true)
with check (true);

-- Ensure DELETE is allowed for cleanupOldData (Admin features)
create policy "Enable delete for authenticated users on transactions"
on "public"."transactions"
for delete
to authenticated
using (true);
