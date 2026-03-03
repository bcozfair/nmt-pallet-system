-- Function to sync public.users changes to auth.users metadata
CREATE OR REPLACE FUNCTION public.sync_user_details()
RETURNS trigger AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = 
      jsonb_set(
        jsonb_set(
            jsonb_set(
                COALESCE(raw_user_meta_data, '{}'::jsonb),
                '{full_name}',
                to_jsonb(NEW.full_name)
            ),
            '{department}',
            to_jsonb(NEW.department)
        ),
        '{role}',
        to_jsonb(NEW.role)
      )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function
DROP TRIGGER IF EXISTS on_user_update_sync_auth ON public.users;
CREATE TRIGGER on_user_update_sync_auth
AFTER UPDATE ON public.users
FOR EACH ROW
WHEN (
    OLD.full_name IS DISTINCT FROM NEW.full_name OR 
    OLD.department IS DISTINCT FROM NEW.department OR
    OLD.role IS DISTINCT FROM NEW.role
)
EXECUTE FUNCTION public.sync_user_details();
