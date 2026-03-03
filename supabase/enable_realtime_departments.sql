/**
 * Enable Realtime for Departments Table
 * 
 * Issue: Real-time updates were not working for the departments table.
 * Cause: The table was not added to the 'supabase_realtime' publication.
 * Fix: Add the table to the publication.
 */

-- Add the departments table to the supabase_realtime publication
alter publication supabase_realtime add table departments;

-- Verify the change (Optional, for debugging)
-- select * from pg_publication_tables where pubname = 'supabase_realtime';
