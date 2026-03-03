-- Function to allow Admins to reset passwords for other users
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION admin_reset_password(target_user_id UUID, new_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the executing user is an admin
  -- We assume 'admin' role is stored in public.users metadata or checking the users table
  -- Adjust the check logic based on your actual Admin verification needs.
  -- Here we check public.users table for the current executing user.
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Update the password
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;
END;
$$;
