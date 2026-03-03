-- Create the storage bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('damage_reports', 'damage_reports', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload files
create policy "Authenticated users can upload damage reports"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'damage_reports' );

-- Allow public (and mobile app) to view the files
create policy "Public can view damage reports"
on storage.objects for select
to public
using ( bucket_id = 'damage_reports' );
