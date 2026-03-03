-- Create a table to store system-wide configuration
-- This table is designed to be extensible for future settings without schema changes for every new key.

CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read settings (needed for login/app logic)
CREATE POLICY "Allow public read access" ON public.system_settings
    FOR SELECT USING (true);

-- Policy: Only Admins can update settings
-- Assuming 'admin' role check via auth.jwt() -> role or public.users check
-- For simplicity in this context, we'll check if the user has a custom claim or exists in our admin list logic.
-- Ideally:
-- CREATE POLICY "Allow admin update" ON public.system_settings
--    FOR UPDATE USING (
--       auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
--    );
-- For now, to allow the setup script to run easily, we will allow authenticated users or specific admins.
-- Let's stick to the common pattern for this app:
CREATE POLICY "Allow admin update" ON public.system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Insert Default Values (Only if they don't exist)
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('admin_email_base', 'bcozfair@gmail.com', 'Base email used for Employee ID alias generation'),
    ('overdue_days', '7', 'Number of days before an item is marked overdue'),
    ('line_channel_token', '', 'Long-lived access token for LINE Messaging API'),
    ('line_target_id', '', 'User ID or Group ID for LINE notifications'),
    ('report_scheduled_days', '["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]', 'JSON array of days to send reports'),
    ('report_time_morning', '08:00', 'Time to send morning report (HH:mm)'),
    ('report_time_evening', '16:00', 'Time to send evening report (HH:mm)')
ON CONFLICT (key) DO NOTHING;
