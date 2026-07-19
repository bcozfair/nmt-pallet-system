-- =============================================================================
-- 20260719_04_storage.sql
-- Phase 3: lock down the damage_reports bucket.
--
-- Requires 20260719_01_security_helpers.sql (provides public.is_admin()).
--
-- BEFORE
-- ------
--   * bucket public = true  (setup_storage.sql:3)
--   * SELECT granted to role `public` (setup_storage.sql:13-16) -- anonymous
--     read of every damage photo ever uploaded
--   * DELETE granted to every authenticated user (fix_permissions.sql:3-6) --
--     any staff member could erase another user's evidence
--   * object names are `{palletId}_{Date.now()}.jpg`
--     (services/transactionService.ts:256), i.e. guessable, so "the URL is
--     unguessable" was never a defence
--
-- AFTER
-- -----
--   * bucket private; reads go through short-lived signed URLs minted per view
--     (services/storageService.ts)
--   * SELECT/INSERT restricted to authenticated
--   * DELETE restricted to admins (only resolveDamage() deletes, and that is an
--     admin action)
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Make the bucket private
-- -----------------------------------------------------------------------------
-- With public = false, getPublicUrl() stops resolving and createSignedUrl()
-- becomes the only way in. The app change is in services/storageService.ts.
update storage.buckets
set public = false
where id = 'damage_reports';


-- -----------------------------------------------------------------------------
-- 2. Replace the old object policies
-- -----------------------------------------------------------------------------
drop policy if exists "Public can view damage reports"                on storage.objects;
drop policy if exists "Authenticated users can upload damage reports" on storage.objects;
drop policy if exists "Authenticated users can delete damage reports" on storage.objects;

-- Read: any signed-in user. Staff need to see evidence they just uploaded, and
-- admins review it in PalletDetailModal / TransactionTable.
create policy "damage_reports_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'damage_reports');

-- Write: any signed-in user, because reporting damage is a staff action.
create policy "damage_reports_insert_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'damage_reports');

-- Delete: admins only. The single caller is resolveDamage(), reached from the
-- admin inventory screen.
create policy "damage_reports_delete_admin"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'damage_reports' and public.is_admin());

-- No UPDATE policy: evidence images are immutable once uploaded.

commit;

-- -----------------------------------------------------------------------------
-- NOTE ON EXISTING ROWS
-- ---------------------
-- transactions.evidence_image_url currently stores full public URLs of the form
--   https://<project>.supabase.co/storage/v1/object/public/damage_reports/<file>
-- Those URLs stop resolving the moment the bucket goes private. No data
-- migration is required: services/storageService.ts derives the object name
-- from whatever is stored (URL or bare filename) and mints a signed URL at
-- display time, so old and new rows both work.
--
-- Verification:
--   select id, name, public from storage.buckets where id = 'damage_reports';
--   -- public must be false
-- -----------------------------------------------------------------------------
