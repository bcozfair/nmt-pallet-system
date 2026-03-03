
-- Function to get users with their auth data
CREATE OR REPLACE FUNCTION get_users_with_auth()
RETURNS TABLE (
  id uuid,
  employee_id text,
  full_name text,
  role text,
  department text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
SECURITY DEFINER
SET search_path = public, auth
AS $$
#variable_conflict use_column
BEGIN
  -- Check if the requesting user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.employee_id,
    u.full_name,
    u.role,
    u.department,
    au.created_at,
    au.last_sign_in_at
  FROM public.users u
  JOIN auth.users au ON u.id = au.id
  ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql;
