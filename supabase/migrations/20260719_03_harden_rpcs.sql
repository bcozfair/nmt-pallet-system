-- =============================================================================
-- 20260719_03_harden_rpcs.sql
-- Phase 1: close the RPC and trigger holes.
--
-- Requires 20260719_01_security_helpers.sql (provides public.is_admin()).
--
-- Four classes of problem are fixed here:
--
--  1. update_admin_email_base() had NO authorization check at all. It is
--     SECURITY DEFINER, loops over every row in public.users, and rewrites
--     auth.users.email. Any caller holding the anon key -- which ships inside
--     the deployed JS bundle -- could repoint every account's login email at a
--     domain they control and then password-reset their way into all of them.
--
--  2. handle_new_user() read the new user's role straight out of
--     raw_user_meta_data, which is supplied by the client in the signUp call.
--     Self-service administrator, by design.
--
--  3. Five SECURITY DEFINER functions had no `SET search_path`. A caller who
--     controls search_path can put their own `users` table ahead of public's,
--     making every `SELECT 1 FROM public.users ... role='admin'` check pass.
--
--  4. Postgres grants EXECUTE on new functions to PUBLIC by default, and
--     Supabase's anon/authenticated roles inherit from PUBLIC. None of these
--     functions ever revoked it, so all of them were reachable unauthenticated.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. update_admin_email_base -- add the missing authorization check
-- -----------------------------------------------------------------------------
-- Return shape is unchanged (jsonb with a `success` key) because
-- services/settingsService.ts reads data?.success.
create or replace function public.update_admin_email_base(new_email_base text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    u                 record;
    new_user_part     text;
    new_domain_part   text;
    new_email         text;
    updated_count     int := 0;
begin
    -- THE FIX. Everything below rewrites authentication identities for the
    -- entire organisation; it must never run for a non-admin.
    if not public.is_admin() then
        raise exception 'Access denied: only an administrator may change the admin email base'
          using errcode = '42501';
    end if;

    if new_email_base is null or position('@' in new_email_base) = 0 then
        raise exception 'Invalid email format';
    end if;

    insert into public.system_settings (key, value, updated_at, updated_by)
    values ('admin_email_base', new_email_base, now(), auth.uid())
    on conflict (key) do update
      set value      = excluded.value,
          updated_at = excluded.updated_at,
          updated_by = excluded.updated_by;

    new_user_part   := split_part(new_email_base, '@', 1);
    new_domain_part := split_part(new_email_base, '@', 2);

    for u in select id, employee_id from public.users loop
        new_email := new_user_part || '+' || u.employee_id || '@' || new_domain_part;

        update auth.users
        set email = new_email
        where id = u.id;

        if found then
            updated_count := updated_count + 1;
        end if;
    end loop;

    return jsonb_build_object(
        'success',       true,
        'message',       'Admin Email Base updated',
        'updated_count', updated_count,
        'new_base',      new_email_base
    );

-- The exception block is a plpgsql subtransaction: on error every UPDATE above
-- is rolled back, so a mid-loop failure cannot leave users split across two
-- email bases. SQLERRM is surfaced instead of being swallowed.
exception when others then
    return jsonb_build_object('success', false, 'message', SQLERRM);
end;
$$;

revoke execute on function public.update_admin_email_base(text) from public, anon;
grant  execute on function public.update_admin_email_base(text) to authenticated;


-- -----------------------------------------------------------------------------
-- 2. handle_new_user -- stop trusting client-supplied role
-- -----------------------------------------------------------------------------
-- raw_user_meta_data is whatever the caller passed to supabase.auth.signUp().
-- New accounts are now ALWAYS created as 'staff'. Promotion happens only
-- through admin_set_role() below, which checks the caller.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, role, department, employee_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'No Name'),
    'staff',   -- hardcoded. NEVER read this from raw_user_meta_data.
    coalesce(new.raw_user_meta_data->>'department', '-'),
    coalesce(new.raw_user_meta_data->>'employee_id', '-')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- -----------------------------------------------------------------------------
-- 3. admin_set_role -- the only supported promotion path
-- -----------------------------------------------------------------------------
-- Restores the "admin creates an admin account" feature that hardcoding the
-- trigger above would otherwise break. services/authService.ts calls this
-- immediately after createAccountByAdmin()'s signUp when role='admin'.
create or replace function public.admin_set_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied: only an administrator may assign roles'
      using errcode = '42501';
  end if;

  if new_role not in ('staff', 'admin') then
    raise exception 'Invalid role: %', new_role;
  end if;

  -- Refuse to strip the last administrator, which would lock everyone out of
  -- user management permanently.
  if new_role = 'staff'
     and exists (select 1 from public.users where id = target_user_id and role = 'admin')
     and (select count(*) from public.users where role = 'admin') <= 1 then
    raise exception 'Cannot demote the last remaining administrator';
  end if;

  update public.users set role = new_role where id = target_user_id;

  if not found then
    raise exception 'User not found: %', target_user_id;
  end if;
end;
$$;

revoke execute on function public.admin_set_role(uuid, text) from public, anon;
grant  execute on function public.admin_set_role(uuid, text) to authenticated;


-- -----------------------------------------------------------------------------
-- 4. admin_reset_password -- search_path + session revocation + grants
-- -----------------------------------------------------------------------------
-- search_path includes `extensions` because that is where Supabase installs
-- pgcrypto; with `SET search_path = public` alone, crypt()/gen_salt() would no
-- longer resolve and every reset would fail.
create or replace function public.admin_reset_password(target_user_id uuid, new_password text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied: only an administrator may reset passwords'
      using errcode = '42501';
  end if;

  if new_password is null or length(new_password) < 6 then
    raise exception 'Password must be at least 6 characters';
  end if;

  update auth.users
  set encrypted_password = crypt(new_password, gen_salt('bf'))
  where id = target_user_id;

  if not found then
    raise exception 'User not found: %', target_user_id;
  end if;

  -- A password reset that leaves existing sessions alive does not actually
  -- lock out whoever prompted the reset. Guarded because the table name has
  -- moved across GoTrue versions.
  begin
    delete from auth.sessions where user_id = target_user_id;
  exception when undefined_table then
    null;
  end;
end;
$$;

revoke execute on function public.admin_reset_password(uuid, text) from public, anon;
grant  execute on function public.admin_reset_password(uuid, text) to authenticated;


-- -----------------------------------------------------------------------------
-- 5. delete_user_complete -- search_path, FK handling, grants
-- -----------------------------------------------------------------------------
-- The original deleted public.users then auth.users while ignoring both
-- referencing tables. Depending on how the FKs were declared in the dashboard
-- that either failed with an opaque constraint error or silently cascaded away
-- the user's entire transaction history.
--
-- BEHAVIOUR CHANGE, DELIBERATE: deletion is now refused for users who have
-- transaction history, because destroying an audit trail to tidy up a staff
-- list is the wrong trade. Deactivate or rename the account instead.
create or replace function public.delete_user_complete(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  tx_count int;
begin
  if not public.is_admin() then
    raise exception 'Access denied: only an administrator may delete users'
      using errcode = '42501';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'You cannot delete your own account';
  end if;

  select count(*) into tx_count
  from public.transactions
  where user_id = target_user_id;

  if tx_count > 0 then
    raise exception
      'Cannot delete: this user has % transaction(s) in the audit trail. Deleting them would destroy that history.',
      tx_count;
  end if;

  -- Release the system_settings.updated_by reference, which would otherwise
  -- block the delete on its NO ACTION foreign key.
  update public.system_settings
  set updated_by = null
  where updated_by = target_user_id;

  delete from public.users where id = target_user_id;
  delete from auth.users  where id = target_user_id;
end;
$$;

revoke execute on function public.delete_user_complete(uuid) from public, anon;
grant  execute on function public.delete_user_complete(uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- 6. get_active_admins -- revoke anonymous access
-- -----------------------------------------------------------------------------
-- This returned every administrator's full_name and employee_id to
-- unauthenticated callers. Login emails are deterministic
-- ({base}+{employee_id}@{domain}, see services/authService.ts) and
-- admin_email_base is readable by anon, so this handed out the exact login
-- identity of every admin in the system.
--
-- The forgot-password screen no longer calls it -- see components/LoginPage.tsx,
-- which now takes a typed employee id and always shows the same generic
-- confirmation. The function is kept for authenticated admin use.
create or replace function public.get_active_admins()
returns table (employee_id text, full_name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  return query
    select u.employee_id, u.full_name
    from public.users u
    where u.role = 'admin';
end;
$$;

revoke execute on function public.get_active_admins() from public, anon;
grant  execute on function public.get_active_admins() to authenticated;


-- -----------------------------------------------------------------------------
-- 7. sync_user_details -- add the missing search_path
-- -----------------------------------------------------------------------------
-- Body is unchanged. Note this writes to raw_user_meta_data (user_metadata),
-- which is client-writable via supabase.auth.updateUser(). Nothing may ever
-- trust the `role` value stored there; public.users remains the only source of
-- truth, and is_admin() reads only from it.
create or replace function public.sync_user_details()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update auth.users
  set raw_user_meta_data =
      jsonb_set(
        jsonb_set(
          jsonb_set(
            coalesce(raw_user_meta_data, '{}'::jsonb),
            '{full_name}', to_jsonb(NEW.full_name)
          ),
          '{department}', to_jsonb(NEW.department)
        ),
        '{role}', to_jsonb(NEW.role)
      )
  where id = NEW.id;
  return NEW;
end;
$$;


-- -----------------------------------------------------------------------------
-- 8. get_users_with_auth -- lock down execution
-- -----------------------------------------------------------------------------
-- Already had SET search_path and an in-body admin check; it only needed the
-- grants tightened. See also services/userService.ts, where the client-side
-- fallback that silently re-queried public.users on "Access denied" has been
-- removed -- that fallback defeated this function's admin gate entirely.
revoke execute on function public.get_users_with_auth() from public, anon;
grant  execute on function public.get_users_with_auth() to authenticated;

commit;

-- -----------------------------------------------------------------------------
-- Post-apply verification -- expect zero rows (no SECURITY DEFINER function in
-- public left without a fixed search_path):
--
--   select p.proname
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and p.prosecdef and p.proconfig is null;
--
-- And confirm anon can no longer execute the admin RPCs:
--
--   select p.proname,
--          has_function_privilege('anon', p.oid, 'execute') as anon_can_execute
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public'
--     and p.proname in ('update_admin_email_base','admin_reset_password',
--                       'delete_user_complete','get_active_admins',
--                       'get_users_with_auth','admin_set_role','is_admin');
-- -----------------------------------------------------------------------------
