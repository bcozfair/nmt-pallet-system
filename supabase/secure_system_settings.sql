-- 1. Add is_secret column
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS is_secret BOOLEAN DEFAULT false;

-- 2. Mark specific keys as secret
UPDATE public.system_settings 
SET is_secret = true 
WHERE key IN ('line_channel_token', 'line_target_id');

-- 3. Update RLS Policies using DROP and CREATE to ensure clean state

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access" ON public.system_settings;
DROP POLICY IF EXISTS "Allow admin update" ON public.system_settings;

-- Policy: Everyone can read ONLY NON-SECRET settings
CREATE POLICY "Allow public read access" ON public.system_settings
    FOR SELECT USING (is_secret = false);

-- Policy: Admins can READ EVERYTHING (for debugging/management if needed, 
-- BUT technically we want to hide it in UI usually, but DB access should be allowed for Admin roles in many cases.
-- HOWEVER, user requested "Maximum Security", so let's restrict SELECT even for admins via API if possible?
-- Actually, if we restrict SELECT for admins too, they can never see it. The requirement is "Not visible in Browser".
-- Browsers use the authenticated user's token. If we restrict SELECT based on is_secret=false even for admins, 
-- then `select *` will return null for those columns or filter the rows out.
-- Let's apply valid RLS: 
-- Public/Authenticated API requests (Browser) -> CANNOT SEE SECRETS.
-- Service Role (Edge Function) -> BYPASSES RLS -> CAN SEE SECRETS.

-- So, we reuse the SAME read policy for everyone (including admins) via API.
-- This ensures even if I am Admin, `select *` returns only public settings.
-- Note: Update policy still needs to allow Admins to UPDATE rows they can't see? Yes, Postgres allows blindly updating rows you can't select if policy permits UPDATE.

-- Policy: Admins can UPDATE settings
CREATE POLICY "Allow admin update" ON public.system_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Admin INSERT (for new settings)
CREATE POLICY "Allow admin insert" ON public.system_settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
