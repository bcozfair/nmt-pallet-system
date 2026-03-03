-- Fix Transactions Table Primary Key
-- The 409 error suggests a constraint violation. It is likely that 'pallet_id' was incorrectly set as the PK.
-- This script transforms the table to use a proper UUID primary key.

BEGIN;

-- 1. If existing PK is not 'id', drop it.
-- (This is a bit tricky in generic SQL without knowing the constraint name, but we can try to drop the constraint on pallet_id if it exists)
-- safeguarding: We will just try to add an ID column and make it PK.

-- Add 'id' column if it doesn't exist
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();

-- Drop existing generic primary key (if any). 
-- WARNING: This assumes you want to reset the PK. If you have custom named constraints, you might need to find them.
-- But typically Supabase/Postgres PK is named 'transactions_pkey'.
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_pkey;

-- Set 'id' as the new Project Key
ALTER TABLE transactions ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);

-- Ensure pallet_id is not unique (it's a foreign key, many transactions per pallet)
-- Check if there is a unique index on pallet_id and drop it
DROP INDEX IF EXISTS transactions_pallet_id_key;

COMMIT;
