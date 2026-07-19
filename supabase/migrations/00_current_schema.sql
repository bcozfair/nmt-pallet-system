-- =============================================================================
-- NMT Pallet System -- complete database schema
--
-- Generated 2026-07-20 by introspecting the live project, so this is a faithful
-- mirror of the running database rather than a reconstruction from memory.
-- Running it once against an empty Supabase project reproduces the system
-- exactly: tables, constraints, functions, triggers, RLS, storage and realtime.
--
-- It replaces the 16 loose .sql files that used to sit in supabase/. Those were
-- a chronological record of one-off dashboard hotfixes, several of which had
-- been superseded and would re-open security holes if re-run. Their history is
-- still in git if it is ever needed.
--
-- Apply order inside this file matters: extensions -> tables -> functions ->
-- triggers -> policies. The policies call is_admin(), so the function has to
-- exist first; the foreign keys require their target tables first.
-- =============================================================================


-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================
create extension if not exists "uuid-ossp";   -- uuid_generate_v4(), used as a column default
create extension if not exists pgcrypto;      -- crypt()/gen_salt(), used by admin_reset_password


-- =============================================================================
-- 2. TABLES
-- =============================================================================

-- ---- departments -----------------------------------------------------------
-- The master list of destinations. Note the app joins to this by NAME, not by
-- id: users.department, pallets.current_location and transactions.
-- department_dest all store the text name. Renaming a department therefore does
-- not propagate. 'Warehouse' is a magic value meaning "not checked out".
create table if not exists public.departments (
    id          uuid primary key default uuid_generate_v4(),
    name        text not null,
    is_active   boolean default true,
    created_at  timestamptz not null default timezone('utc', now())
);

-- ---- pallets ---------------------------------------------------------------
-- pallet_id is the text encoded in the physical QR label, and is the primary
-- key -- there is no surrogate id.
create table if not exists public.pallets (
    pallet_id              text primary key,
    status                 text default 'available'
                             check (status in ('available', 'in_use', 'damaged')),
    current_location       text,
    last_checkout_date     timestamptz,
    created_at             timestamptz not null default timezone('utc', now()),
    last_transaction_date  timestamptz default now(),
    pallet_remark          text
);

-- ---- users -----------------------------------------------------------------
-- One row per auth.users row, created by the handle_new_user trigger below.
-- `role` is the only authorisation source in the system: is_admin() reads it,
-- and every policy and admin RPC depends on it.
create table if not exists public.users (
    id           uuid primary key references auth.users(id) on delete cascade,
    employee_id  text not null unique,
    full_name    text not null,
    role         text default 'staff' check (role in ('staff', 'admin')),
    department   text,
    created_at   timestamptz not null default timezone('utc', now())
);

-- ---- transactions ----------------------------------------------------------
-- The audit trail. Every check-out, check-in, damage report and repair.
--
-- WARNING, and it is deliberate that this is spelled out: the pallet_id foreign
-- key is ON DELETE CASCADE. Deleting a pallet silently deletes its entire
-- history. The "Discard" branch of the damage-resolution flow does exactly
-- that. The user_id key has no cascade, which is what makes
-- delete_user_complete() refuse to remove a user who has history.
create table if not exists public.transactions (
    id                  uuid primary key default uuid_generate_v4(),
    pallet_id           text not null references public.pallets(pallet_id) on delete cascade,
    user_id             uuid not null references public.users(id),
    action_type         text not null
                          check (action_type in ('check_out', 'check_in', 'report_damage', 'repair')),
    department_dest     text,
    evidence_image_url  text,
    timestamp           timestamptz not null default timezone('utc', now()),
    transaction_remark  text
);

-- ---- system_settings -------------------------------------------------------
-- Key/value configuration. is_secret drives the read policy: secret rows are
-- invisible to the browser and readable only by the service role, which is how
-- the LINE channel token stays out of the client bundle.
create table if not exists public.system_settings (
    key          text primary key,
    value        text not null,
    description  text,
    updated_at   timestamptz not null default timezone('utc', now()),
    updated_by   uuid references auth.users(id),
    is_secret    boolean default false
);


-- =============================================================================
-- 3. FUNCTIONS
--
-- Every one is SECURITY DEFINER and every one pins search_path. Without the pin
-- a caller who controls search_path can shadow public.users with their own
-- table and defeat every `role = 'admin'` check in the system.
-- =============================================================================

-- is_admin() exists to break RLS recursion. A policy on public.users that
-- inlines `EXISTS (SELECT 1 FROM public.users ...)` re-enters the policy being
-- evaluated and Postgres aborts the query. This function is owned by a role
-- that bypasses RLS, so the lookup inside it does not re-trigger the policy.
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
    select exists (
        select 1 from public.users where id = auth.uid() and role = 'admin'
    );
$$;

-- Blocks any change to users.role by a non-admin. RLS cannot express this:
-- WITH CHECK sees only the new row and has no access to OLD, so it cannot
-- detect a *change*. auth.uid() is null for service_role/SQL-editor sessions,
-- which are trusted and allowed through.
create or replace function public.prevent_role_escalation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if new.role is distinct from old.role then
        if auth.uid() is not null and not public.is_admin() then
            raise exception 'Permission denied: only an administrator may change a user role'
                using errcode = '42501';
        end if;
    end if;
    return new;
end;
$$;

-- Mirrors a new auth.users row into public.users.
-- role is hardcoded to 'staff' and must stay that way: raw_user_meta_data is
-- supplied by whoever called signUp, so reading role from it lets anyone with
-- the (public) anon key create themselves an administrator.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    insert into public.users (id, full_name, role, department, employee_id)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', 'No Name'),
        'staff',
        coalesce(new.raw_user_meta_data->>'department', '-'),
        coalesce(new.raw_user_meta_data->>'employee_id', '-')
    );
    return new;
end;
$$;

-- Copies profile edits back into auth.users metadata so the two stay in step.
-- Nothing may ever trust the role value stored there -- raw_user_meta_data is
-- client-writable via supabase.auth.updateUser(). public.users is the only
-- source of truth.
create or replace function public.sync_user_details()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
    update auth.users
    set raw_user_meta_data =
        jsonb_set(
            jsonb_set(
                jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb),
                          '{full_name}',  to_jsonb(NEW.full_name)),
                '{department}', to_jsonb(NEW.department)),
            '{role}', to_jsonb(NEW.role))
    where id = NEW.id;
    return NEW;
end;
$$;

-- The only supported way to promote or demote. handle_new_user() always creates
-- staff, so admin accounts are made by creating the account and then calling
-- this from an existing admin's session.
create or replace function public.admin_set_role(target_user_id uuid, new_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
    if not public.is_admin() then
        raise exception 'Access denied: only an administrator may assign roles'
            using errcode = '42501';
    end if;

    if new_role not in ('staff', 'admin') then
        raise exception 'Invalid role: %', new_role;
    end if;

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

-- search_path includes `extensions` because that is where Supabase installs
-- pgcrypto; without it crypt()/gen_salt() do not resolve and every reset fails.
create or replace function public.admin_reset_password(target_user_id uuid, new_password text)
returns void language plpgsql security definer set search_path = public, auth, extensions as $$
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

    -- A reset that leaves existing sessions alive does not lock anyone out.
    begin
        delete from auth.sessions where user_id = target_user_id;
    exception when undefined_table then null;
    end;
end;
$$;

-- Refuses to delete users who have history, because transactions.user_id has no
-- cascade and, more importantly, because destroying an audit trail to tidy up a
-- staff list is the wrong trade.
create or replace function public.delete_user_complete(target_user_id uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
declare tx_count int;
begin
    if not public.is_admin() then
        raise exception 'Access denied: only an administrator may delete users'
            using errcode = '42501';
    end if;

    if target_user_id = auth.uid() then
        raise exception 'You cannot delete your own account';
    end if;

    select count(*) into tx_count from public.transactions where user_id = target_user_id;
    if tx_count > 0 then
        raise exception
            'Cannot delete: this user has % transaction(s) in the audit trail. Deleting them would destroy that history.',
            tx_count;
    end if;

    update public.system_settings set updated_by = null where updated_by = target_user_id;

    delete from public.users where id = target_user_id;
    delete from auth.users  where id = target_user_id;
end;
$$;

-- Admin-only. This used to be callable anonymously to fill a dropdown on the
-- forgot-password screen, which handed every admin's employee_id and full_name
-- to unauthenticated visitors -- and since login emails are deterministically
-- {base}+{employee_id}@{domain}, that was their exact login identity.
create or replace function public.get_active_admins()
returns table (employee_id text, full_name text)
language plpgsql security definer set search_path = public as $$
begin
    if not public.is_admin() then
        raise exception 'Access denied' using errcode = '42501';
    end if;

    return query
        select u.employee_id, u.full_name from public.users u where u.role = 'admin';
end;
$$;

-- Joins the profile to auth.users for created_at / last_sign_in_at, which the
-- user-management screen shows. #variable_conflict is required because the OUT
-- parameter names shadow the column names.
create or replace function public.get_users_with_auth()
returns table (
    id uuid, employee_id text, full_name text, role text,
    department text, created_at timestamptz, last_sign_in_at timestamptz
)
language plpgsql security definer set search_path = public, auth as $$
#variable_conflict use_column
begin
    if not public.is_admin() then
        raise exception 'Access denied' using errcode = '42501';
    end if;

    return query
        select u.id, u.employee_id, u.full_name, u.role, u.department,
               au.created_at, au.last_sign_in_at
        from public.users u
        join auth.users au on u.id = au.id
        order by au.created_at desc;
end;
$$;

-- Rewrites every account's login email when the shared admin mailbox changes.
-- The admin check is the whole point: without it, any anon caller could point
-- every account at a domain they control and password-reset their way in.
create or replace function public.update_admin_email_base(new_email_base text)
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare
    u record;
    new_user_part text; new_domain_part text; new_email text;
    updated_count int := 0;
begin
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
        set value = excluded.value, updated_at = excluded.updated_at,
            updated_by = excluded.updated_by;

    new_user_part   := split_part(new_email_base, '@', 1);
    new_domain_part := split_part(new_email_base, '@', 2);

    for u in select id, employee_id from public.users loop
        new_email := new_user_part || '+' || u.employee_id || '@' || new_domain_part;
        update auth.users set email = new_email where id = u.id;
        if found then updated_count := updated_count + 1; end if;
    end loop;

    return jsonb_build_object('success', true, 'message', 'Admin Email Base updated',
                              'updated_count', updated_count, 'new_base', new_email_base);

-- This block is a plpgsql subtransaction: on error every UPDATE above rolls
-- back, so a mid-loop failure cannot leave accounts split across two bases.
exception when others then
    return jsonb_build_object('success', false, 'message', SQLERRM);
end;
$$;


-- =============================================================================
-- 4. TRIGGERS
-- =============================================================================
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

drop trigger if exists on_user_update_sync_auth on public.users;
create trigger on_user_update_sync_auth
    after update on public.users
    for each row
    when (old.full_name  is distinct from new.full_name
       or old.department is distinct from new.department
       or old.role       is distinct from new.role)
    execute function public.sync_user_details();

drop trigger if exists trg_prevent_role_escalation on public.users;
create trigger trg_prevent_role_escalation
    before update on public.users
    for each row execute function public.prevent_role_escalation();


-- =============================================================================
-- 5. ROW LEVEL SECURITY
--
-- Permissive policies combine with OR, so a single `USING (true)` granted to
-- `public` anywhere on a table defeats every restrictive policy beside it. Do
-- not add policies through the dashboard without checking what is already here.
-- =============================================================================

alter table public.users           enable row level security;
alter table public.pallets         enable row level security;
alter table public.transactions    enable row level security;
alter table public.departments     enable row level security;
alter table public.system_settings enable row level security;

-- ---- users -----------------------------------------------------------------
-- No INSERT or DELETE policy by design: rows are created by handle_new_user()
-- and removed by delete_user_complete(), both SECURITY DEFINER and both
-- bypassing RLS. No policy means denied.
create policy "users_select_self_or_admin" on public.users
    for select to authenticated
    using (id = auth.uid() or public.is_admin());

create policy "users_update_admin_only" on public.users
    for update to authenticated
    using (public.is_admin()) with check (public.is_admin());

-- ---- pallets ---------------------------------------------------------------
-- Staff flip status and location when scanning, but cannot create or destroy
-- inventory. This is why checkOutPallet() uses .update() and not .upsert():
-- an upsert would fail the INSERT policy, and the old upsert silently created a
-- pallet record for any unrecognised QR code.
create policy "pallets_select_authenticated" on public.pallets
    for select to authenticated using (true);

create policy "pallets_update_authenticated" on public.pallets
    for update to authenticated using (true) with check (true);

create policy "pallets_insert_admin" on public.pallets
    for insert to authenticated with check (public.is_admin());

create policy "pallets_delete_admin" on public.pallets
    for delete to authenticated using (public.is_admin());

-- ---- transactions ----------------------------------------------------------
-- Staff see only their own history (which is all MobileHistory ever asks for);
-- every cross-user view is admin-only. Inserts must be attributed to the caller,
-- which blocks forging an entry under another employee's name.
create policy "transactions_select_own_or_admin" on public.transactions
    for select to authenticated
    using (user_id = auth.uid() or public.is_admin());

create policy "transactions_insert_self" on public.transactions
    for insert to authenticated with check (user_id = auth.uid());

create policy "transactions_update_admin" on public.transactions
    for update to authenticated
    using (public.is_admin()) with check (public.is_admin());

create policy "transactions_delete_admin" on public.transactions
    for delete to authenticated using (public.is_admin());

-- ---- departments -----------------------------------------------------------
create policy "departments_select_authenticated" on public.departments
    for select to authenticated using (true);

create policy "departments_write_admin" on public.departments
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

-- ---- system_settings -------------------------------------------------------
-- SELECT is granted to `public` (i.e. anon too) but filtered by is_secret. The
-- login screen has to read admin_email_base before anyone is authenticated in
-- order to build the alias email, so this cannot be locked to authenticated.
-- Secret rows -- the LINE credentials -- are readable only by the service role,
-- which is why the report is sent from the edge function and not the browser.
create policy "Allow public read access" on public.system_settings
    for select using (is_secret = false);

create policy "Allow admin update" on public.system_settings
    for update using (
        exists (select 1 from public.users where id = auth.uid() and role = 'admin')
    );

create policy "Allow admin insert" on public.system_settings
    for insert with check (
        exists (select 1 from public.users where id = auth.uid() and role = 'admin')
    );


-- =============================================================================
-- 6. FUNCTION GRANTS
--
-- Postgres grants EXECUTE on new functions to PUBLIC by default, and Supabase's
-- anon/authenticated roles inherit from PUBLIC. Every admin entry point has to
-- revoke that explicitly or it is reachable with the anon key.
-- =============================================================================
revoke execute on function public.is_admin()                                from public, anon;
revoke execute on function public.admin_set_role(uuid, text)                from public, anon;
revoke execute on function public.admin_reset_password(uuid, text)          from public, anon;
revoke execute on function public.delete_user_complete(uuid)                from public, anon;
revoke execute on function public.get_active_admins()                       from public, anon;
revoke execute on function public.get_users_with_auth()                     from public, anon;
revoke execute on function public.update_admin_email_base(text)             from public, anon;

grant execute on function public.is_admin()                                 to authenticated;
grant execute on function public.admin_set_role(uuid, text)                 to authenticated;
grant execute on function public.admin_reset_password(uuid, text)           to authenticated;
grant execute on function public.delete_user_complete(uuid)                 to authenticated;
grant execute on function public.get_active_admins()                        to authenticated;
grant execute on function public.get_users_with_auth()                      to authenticated;
grant execute on function public.update_admin_email_base(text)              to authenticated;


-- =============================================================================
-- 7. REALTIME
-- Drives the live-refresh subscriptions in palletService and departmentService.
-- Realtime respects RLS, so subscribers only receive rows their policies allow.
-- =============================================================================
alter publication supabase_realtime add table public.pallets;
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.departments;
alter publication supabase_realtime add table public.users;


-- =============================================================================
-- 8. STORAGE
--
-- Private bucket. Object names are `{palletId}_{timestamp}.jpg`, which is
-- guessable, so "nobody knows the URL" was never a defence -- the app mints
-- short-lived signed URLs at display time instead (services/storageService.ts).
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('damage_reports', 'damage_reports', false)
on conflict (id) do update set public = false;

create policy "damage_reports_select_authenticated" on storage.objects
    for select to authenticated using (bucket_id = 'damage_reports');

create policy "damage_reports_insert_authenticated" on storage.objects
    for insert to authenticated with check (bucket_id = 'damage_reports');

-- Deleting evidence happens only in resolveDamage(), an admin action.
create policy "damage_reports_delete_admin" on storage.objects
    for delete to authenticated
    using (bucket_id = 'damage_reports' and public.is_admin());

-- No UPDATE policy: evidence images are immutable once uploaded.


-- =============================================================================
-- 9. SEED
-- Defaults only; nothing here is a secret. The LINE values are filled in from
-- the Settings screen and are flagged is_secret so the browser cannot read them.
-- =============================================================================
insert into public.system_settings (key, value, description, is_secret) values
    ('admin_email_base',      'bcozfair@gmail.com', 'Base mailbox for +alias login emails', false),
    ('overdue_days',          '7',                  'Days before a checked-out pallet counts as overdue', false),
    ('line_channel_token',    '',                   'LINE Messaging API channel access token', true),
    ('line_target_id',        '',                   'LINE user or group ID for notifications', true),
    ('report_scheduled_days', '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]', 'Days the report runs', false),
    ('report_time_morning',   '08:00',              'Overdue report time, Asia/Bangkok', false),
    ('report_time_evening',   '16:00',              'Daily summary time, Asia/Bangkok', false)
on conflict (key) do nothing;

update public.system_settings set is_secret = true
where key in ('line_channel_token', 'line_target_id');


-- =============================================================================
-- FIRST ADMIN
--
-- handle_new_user() creates every account as 'staff', including the first one,
-- and admin_set_role() requires an existing admin -- so a fresh project has no
-- way to make its first administrator through the app. Sign up once, then run
-- this from the SQL editor, which bypasses RLS and the escalation trigger:
--
--     update public.users set role = 'admin' where employee_id = '<your id>';
-- =============================================================================
