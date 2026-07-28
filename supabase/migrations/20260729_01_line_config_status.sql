-- =============================================================================
-- Lets the Settings screen report whether LINE is configured, without ever
-- handing the browser the credentials themselves.
--
-- Why this exists: system_settings is readable by `public` but filtered --
-- `using (is_secret = false)` in 00_current_schema.sql -- and line_channel_token
-- / line_target_id are flagged is_secret. That filter is correct and stays: the
-- report is sent from the edge function under the service role precisely so the
-- token never reaches a browser. But the LINE card computed its status chip from
-- those same rows, and a filtered-out row is indistinguishable from an empty
-- one. The chip therefore read "Not configured" permanently on a system whose
-- credentials were set and whose reports were being delivered.
--
-- What this returns is a pair of booleans, never the values. Deliberately no
-- length, no prefix, no masked preview -- any of those leak a little, and the
-- screen only needs to know whether the two rows are non-empty.
--
-- Non-admins get {false, false} rather than an error: this is only a chip, and
-- the RPC is not the access control -- the RLS policy above still is.
--
-- Re-runnable: create or replace, and the grants are idempotent.
-- =============================================================================

begin;

create or replace function public.get_line_config_status()
returns jsonb language sql security definer stable set search_path = public as $$
    select case
        when public.is_admin() then jsonb_build_object(
            'has_token', coalesce(
                (select coalesce(value, '') <> '' from public.system_settings
                 where key = 'line_channel_token'), false),
            'has_target', coalesce(
                (select coalesce(value, '') <> '' from public.system_settings
                 where key = 'line_target_id'), false)
        )
        else jsonb_build_object('has_token', false, 'has_target', false)
    end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default and Supabase's anon role inherits
-- from it, so the revoke is what actually keeps this off the anon key. Same
-- pattern as section 6 of 00_current_schema.sql.
revoke execute on function public.get_line_config_status() from public, anon;
grant  execute on function public.get_line_config_status() to authenticated;

commit;
