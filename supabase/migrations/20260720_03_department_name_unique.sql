-- =============================================================================
-- Makes duplicate department names impossible.
--
-- Why this exists: the whole system joins to departments by NAME, not by id --
-- users.department, pallets.current_location and transactions.department_dest
-- are all plain text. Two departments sharing a name therefore produce wrong
-- numbers today, not hypothetically: LocationView builds its stats map keyed by
-- name, so the second row overwrites the first and both then display the same
-- over-counted figures.
--
-- Comparison is case- and whitespace-insensitive: 'Line A', 'line a' and
-- '  Line A  ' are one department.
--
-- DEPLOY ORDER: this one is NOT safe to run ahead of the app. Once the index
-- exists a colliding save raises 23505, and the Locations screen has to be able
-- to catch that -- see LocationView/LocationModals/LocationTable in the same
-- commit. Run this after the app deploy, not before.
--
-- Re-runnable: create ... if not exists / create or replace throughout.
-- =============================================================================

begin;

-- ---- 1. refuse to proceed if the data already collides -----------------------
-- Without this the failure surfaces as a bare "could not create unique index",
-- which does not say which rows are at fault. Merging has to be done by hand
-- and carefully: pallets and transactions reference departments by NAME, so
-- deleting the wrong row silently reassigns inventory to the other department.
do $$
declare
    collisions text;
begin
    select string_agg(format('%s (x%s)', normalised, n), ', ')
    into collisions
    from (
        select lower(trim(name)) as normalised, count(*) as n
        from public.departments
        group by 1
        having count(*) > 1
    ) dupes;

    if collisions is not null then
        raise exception
            'Cannot add the unique index: these department names already collide: %. Merge them by hand first -- pallets.current_location and transactions.department_dest reference departments by name, so deleting the wrong row moves inventory to the other department.',
            collisions;
    end if;
end;
$$;

-- ---- 2. normalise what is already stored ------------------------------------
update public.departments set name = trim(name) where name <> trim(name);

-- ---- 3. keep it normalised from here on -------------------------------------
-- The unique index compares trim(name), but without this the stored value could
-- still carry padding -- so '  Line A  ' would be rejected as a duplicate while
-- an existing row keeps displaying its spaces. The UI trims too; this covers
-- every other writer (SQL editor, edge functions, future callers).
create or replace function public.departments_normalise_name()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    new.name := trim(new.name);
    return new;
end;
$$;

drop trigger if exists trg_departments_normalise_name on public.departments;
create trigger trg_departments_normalise_name
    before insert or update on public.departments
    for each row execute function public.departments_normalise_name();

-- ---- 4. the constraint itself -----------------------------------------------
create unique index if not exists departments_name_unique_ci
    on public.departments (lower(trim(name)));

commit;
