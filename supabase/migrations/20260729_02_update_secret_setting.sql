-- =============================================================================
-- Gives the Settings screen a way to WRITE the two LINE credentials. Until this
-- existed there was none: saving them returned 403 every time, on every system.
--
-- The bug, exactly: settingsService.updateSystemSetting() writes with
-- supabase.upsert(), which PostgREST turns into
--
--     insert into system_settings (...) values (...)
--     on conflict (key) do update set ...
--
-- and Postgres applies the SELECT policy to the *existing conflicting row* on
-- that path, not only the INSERT and UPDATE policies. The SELECT policy here is
-- `using (is_secret = false)` (00_current_schema.sql), and both LINE rows are
-- flagged is_secret, so the row the statement needs to update is invisible to
-- the browser's role. Postgres rejects it with 42501, "new row violates
-- row-level security policy (USING expression)", and PostgREST returns 403.
--
-- Note the shape of that failure: the non-secret keys on the same screen
-- (overdue_days, the report times) saved fine, because their rows are visible.
-- Only the two secrets failed, and only ever with a bare status code -- which is
-- why this survived until someone opened the network tab.
--
-- Why not just let admins read the secret rows: that is the one thing the
-- is_secret split exists to prevent. The report is sent from an edge function
-- under the service role so the channel token never reaches a browser, and
-- get_line_config_status() exists so the status chip can be drawn without
-- reading the values. Widening the SELECT policy would undo all of it to fix a
-- write problem.
--
-- So the write goes through a SECURITY DEFINER function instead -- the same
-- shape update_admin_email_base() already uses for the one other privileged
-- write on this screen. The function owner bypasses RLS, so the conflicting row
-- is visible to it; is_admin() is what actually authorises the call.
--
-- Re-runnable: create or replace, and the grants are idempotent.
-- =============================================================================

begin;

create or replace function public.update_secret_setting(
    setting_key   text,
    setting_value text
)
returns void language plpgsql security definer set search_path = public as $$
begin
    -- SECURITY DEFINER means this body runs as the owner, so this check is the
    -- only thing standing between any authenticated staff account and the LINE
    -- credentials. It is not a convenience -- it is the access control.
    if not public.is_admin() then
        raise exception 'Only an admin may change this setting'
            using errcode = '42501';
    end if;

    -- Without this list the function is a general-purpose write to any row in
    -- system_settings that ignores RLS -- including admin_email_base, whose own
    -- RPC also migrates every user's login alias. Reaching that key through
    -- here would change the setting and leave every account unable to log in.
    if setting_key not in ('line_channel_token', 'line_target_id') then
        raise exception 'Not a secret setting: %', setting_key
            using errcode = '22023';
    end if;

    insert into public.system_settings (key, value, updated_at, updated_by, is_secret)
    values (setting_key, setting_value, now(), auth.uid(), true)
    on conflict (key) do update
        set value      = excluded.value,
            updated_at = excluded.updated_at,
            updated_by = excluded.updated_by,
            -- Restated on the update path too, so a row seeded before the flag
            -- existed cannot stay readable after being written through here.
            is_secret  = true;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default and Supabase's anon role inherits
-- from it, so the revoke is what actually keeps this off the anon key. Same
-- pattern as section 6 of 00_current_schema.sql.
revoke execute on function public.update_secret_setting(text, text) from public, anon;
grant  execute on function public.update_secret_setting(text, text) to authenticated;

commit;
