-- Function to fetch active admin users for Public Forgot Password dropdown
-- Returns only necessary info to avoid leaking too much data, though NAMES are exposed.

CREATE OR REPLACE FUNCTION get_active_admins()
RETURNS TABLE (
  employee_id TEXT,
  full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Use Security Definier to allow anonymous access (for Login Page)
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.employee_id, 
    u.full_name
  FROM public.users u
  WHERE u.role = 'admin';
END;
$$;
