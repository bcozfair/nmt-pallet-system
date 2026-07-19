# Security remediation — record of what was found and fixed

Carried out 2026-07-19. The fixes are folded into `00_current_schema.sql`; this
file is the record of *why* each rule is shaped the way it is, so the schema is
not silently loosened later.

## What was wrong

Verified against the live project using nothing but the anon key, which ships
inside the client bundle by design:

| Probe (anon key only) | Before | After |
|---|---|---|
| `GET /rest/v1/users` | `200`, full table | `200`, `[]` |
| `GET /rest/v1/pallets` | `200`, full table | `200`, `[]` |
| `GET /rest/v1/transactions` | `200`, full table | `200`, `[]` |
| `GET /rest/v1/departments` | `200`, full table | `200`, `[]` |
| `POST /rpc/get_active_admins` | `200`, every admin's name + employee_id | `401` |
| `POST /functions/v1/scheduled-report` | ran, unauthenticated | `401` |

`system_settings` was already correct and was left alone: its `is_secret` filter
was verified to hide the LINE credentials from anon while still exposing
`admin_email_base`, which the login screen needs before anyone is signed in.

Beyond the open tables, three specific holes:

1. **`update_admin_email_base()` had no authorization check.** SECURITY DEFINER,
   loops over every row in `public.users`, rewrites `auth.users.email`. Any
   caller could repoint every account at a domain they controlled and then
   password-reset their way into all of them.
2. **`handle_new_user()` read `role` from `raw_user_meta_data`**, which is
   whatever the client passed to `signUp`. Self-service administrator.
3. **Five SECURITY DEFINER functions had no `SET search_path`.** A caller who
   controls `search_path` can shadow `public.users` and make every
   `role = 'admin'` check pass.

Plus, on the app side: the login form persisted the user's plaintext password to
`localStorage`; the LINE channel token was sent to `api.line.me` through the
public `corsproxy.io` relay; the `damage_reports` bucket was public with
guessable object names; and `userService.fetchUsers` fell back to a raw
`from('users').select('*')` whenever the admin-gated RPC returned "Access
denied", defeating the gate entirely.

## The trap that made this hard to verify

Enabling RLS and creating the new policies was **not enough, and it failed
silently.** The four core tables were created through the Supabase dashboard,
not from this repo, and carried policies like `"Public profiles are viewable by
everyone"` that appear in no `.sql` file here.

Postgres combines permissive policies with `OR`. One leftover `USING (true)`
granted to `public` defeats every restrictive policy beside it. After the first
pass the diagnostics looked perfect — RLS on, all 12 new policies present —
while the anon key still returned the full user table. Only re-running the
external probe caught it.

**Checking configuration is not the same as checking behaviour.** Probe from
outside.

## Rules that must not be relaxed

- `handle_new_user()` hardcodes `'staff'`. Promotion goes through
  `admin_set_role()`, which checks the caller. Never read `role` from signup
  metadata.
- `is_admin()` must stay SECURITY DEFINER. Inlining its query into a policy on
  `public.users` causes infinite recursion and the query aborts.
- Every SECURITY DEFINER function must pin `search_path`.
- New functions default to `EXECUTE` for `PUBLIC`, and `anon` inherits from
  `PUBLIC`. Any new admin entry point needs an explicit `REVOKE`.
- Do not add policies through the dashboard without re-reading what is already
  on the table. See the trap above.

## Known behaviour changes

- `delete_user_complete()` refuses to delete a user who has transaction history.
  Previously this either failed with an opaque foreign-key error or cascaded the
  audit trail away, depending on how the FK was declared.
- `checkOutPallet()` uses `.update()`, not `.upsert()`. Scanning an unrecognised
  QR code no longer silently creates a pallet record.
- The forgot-password screen takes a typed employee ID and always returns the
  same generic message, instead of listing every administrator in a dropdown.
- Staff can no longer edit their own profile row at all (that write path was the
  role-escalation vector, and no screen used it).

## Still open

- **`transactions.pallet_id` is `ON DELETE CASCADE`.** Deleting a pallet deletes
  its entire history, and the "Discard" branch of damage resolution does exactly
  that. Whether that is acceptable is a product decision, but it should be a
  deliberate one.
- **No indexes on `transactions`** beyond the primary key, while every query
  filters on `user_id` or `pallet_id` and orders by `timestamp`. Harmless at the
  current row count; the first thing to fix if the table grows.
- **`departments.name` has no UNIQUE constraint**, and the app joins to
  departments by name rather than by id.
- The **edge function requires `REPORT_TRIGGER_SECRET`** for the cron path. If it
  is unset, scheduled reports stop; the admin "Test send" button still works,
  since that path authenticates with the admin's own JWT.

## Verifying it is still closed

`DIAGNOSE.sql` lists the current RLS state and every policy. The stronger check
is the external one — from outside the app, with only the anon key:

```bash
curl -s "$SUPABASE_URL/rest/v1/users?select=id" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
```

`[]` is correct. RLS filters rows rather than refusing the request, so a `200`
with an empty array is the pass condition, not a failure.
