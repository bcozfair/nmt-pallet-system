-- RPC to Atomic Update Admin Email Base AND migrate all users
-- This function runs with SECURITY DEFINER to bypass RLS and access auth.users

CREATE OR REPLACE FUNCTION update_admin_email_base(new_email_base TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    u RECORD;
    old_email_base TEXT;
    new_user_part TEXT;
    new_domain_part TEXT;
    new_email TEXT;
    updated_count INT := 0;
    employee_id_part TEXT;
BEGIN
    -- 1. Validate Input
    IF new_email_base IS NULL OR position('@' in new_email_base) = 0 THEN
        RAISE EXCEPTION 'Invalid email format';
    END IF;

    -- 2. Get Old Setting (Optional, for logging or validation)
    SELECT value INTO old_email_base FROM public.system_settings WHERE key = 'admin_email_base';
    
    -- 3. Update the Setting
    INSERT INTO public.system_settings (key, value, updated_at, updated_by)
    VALUES ('admin_email_base', new_email_base, now(), auth.uid())
    ON CONFLICT (key) DO UPDATE 
    SET value = EXCLUDED.value, 
        updated_at = EXCLUDED.updated_at, 
        updated_by = EXCLUDED.updated_by;

    -- 4. Parse New Email Parts
    -- e.g. "newadmin@test.com" -> user="newadmin", domain="test.com"
    new_user_part := split_part(new_email_base, '@', 1);
    new_domain_part := split_part(new_email_base, '@', 2);

    -- 5. Loop through all users in public.users to find their Employee IDs
    -- We assume public.users is the source of truth for "active employees"
    FOR u IN SELECT id, employee_id FROM public.users LOOP
        
        -- Construct new email: user+employee_id@domain
        -- e.g. newadmin+staff001@test.com
        new_email := new_user_part || '+' || u.employee_id || '@' || new_domain_part;

        -- Update auth.users directly
        -- Note: We generally shouldn't modify auth schema directly, but this is a specific admin migration
        UPDATE auth.users
        SET email = new_email
        WHERE id = u.id;
        
        IF FOUND THEN
            updated_count := updated_count + 1;
        END IF;

    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Admin Email Base updated',
        'updated_count', updated_count,
        'new_base', new_email_base
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', SQLERRM
    );
END;
$$;
