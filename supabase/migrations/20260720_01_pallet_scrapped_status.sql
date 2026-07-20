-- =============================================================================
-- Adds the terminal pallet status 'scrapped' and its matching audit action
-- type 'scrap'.
--
-- Why this exists: until now the only way to take a pallet out of the system
-- was a permanent DELETE, and transactions.pallet_id is ON DELETE CASCADE --
-- so retiring one pallet destroyed its entire history, in a system whose whole
-- purpose is tracking that history. 'scrapped' retires a pallet while keeping
-- every transaction it ever had, including the damage report and its evidence
-- photo.
--
-- The 'scrap' action type is not optional decoration: without it the write that
-- retires a pallet leaves no row in the audit trail, which defeats the point.
--
-- Safe to run against a live database ahead of the app deploy. Widening a CHECK
-- rejects nothing that was previously accepted, and no existing row can violate
-- the new form.
--
-- Re-runnable: every constraint is dropped before it is recreated.
-- =============================================================================

begin;

alter table public.pallets drop constraint if exists pallets_status_check;
alter table public.pallets add constraint pallets_status_check
    check (status in ('available', 'in_use', 'damaged', 'scrapped'));

alter table public.transactions drop constraint if exists transactions_action_type_check;
alter table public.transactions add constraint transactions_action_type_check
    check (action_type in ('check_out', 'check_in', 'report_damage', 'repair', 'scrap'));

commit;
