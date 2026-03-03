-- FIX: Allow 'repair' action_type and ensure permissions

-- 1. Update the 'action_type' Check Constraint or Enum
-- We try to handle both cases (Enum vs Text Check)

DO $$ 
BEGIN
    -- Case A: If it's a Postgres ENUM type named 'action_type' or 'action_type_enum'
    -- (We cannot run ALTER TYPE inside a DO block in some versions, but we can try generic detection)
    -- NOTE: You might need to run "ALTER TYPE action_type ADD VALUE 'repair';" separately if this fails, 
    -- but usually standard Supabase setups use text or check constraints.
    
    -- Case B: Check Constraint on the table
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_action_type_check') THEN
        ALTER TABLE transactions DROP CONSTRAINT transactions_action_type_check;
        ALTER TABLE transactions ADD CONSTRAINT transactions_action_type_check 
        CHECK (action_type IN ('check_out', 'check_in', 'report_damage', 'repair'));
    END IF;
END $$;

-- If you used a custom Enum type in Supabase UI, run this line MANUALLY if the above doesn't work:
-- ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'repair';


-- 2. Grant INSERT Permissions for Authenticated Users (if missing)
-- (Users/Admins need to be able to insert the 'repair' record)

create policy "Enable insert for authenticated users"
on "public"."transactions"
as permissive
for insert
to authenticated
with check (true);

-- (If policy already exists, this might error, which is fine - you can ignore "already exists")

-- 3. Validation
-- After running this, try repairing a pallet again.
