# Security remediation — apply guide (2026-07-19)

Read this before running anything. Applying `02` out of order will lock the app out.

## What was actually wrong

Verified against the live project using nothing but the anon key that ships inside
the deployed JS bundle:

| Probe | Result |
|---|---|
| `GET /rest/v1/users` | `200` — full table |
| `GET /rest/v1/pallets` | `200` — full table |
| `GET /rest/v1/transactions` | `200` — full table |
| `GET /rest/v1/departments` | `200` — full table |
| `PATCH /rest/v1/users {"role":"admin"}` | `204` — **write accepted** |
| `PATCH /rest/v1/pallets` | `204` — **write accepted** |

The two `PATCH` probes used a `WHERE` clause matching zero rows, so nothing was
modified — but a matching `WHERE` would have been accepted identically. Anyone
who opened DevTools on the deployed site could grant themselves admin, or delete
the inventory, with one request. No exploit chain required.

Separately, `update_admin_email_base()` had no authorization check at all and
rewrites `auth.users.email` for every account — full takeover of every login.
And `handle_new_user()` took the new user's `role` straight from client-supplied
signup metadata.

`system_settings` was the one table already protected correctly (`is_secret`
hides the LINE token from the browser). It is deliberately left untouched.

## Apply order

Run each file in the Supabase SQL Editor, in this order, checking the result
before moving on.

| # | File | Effect |
|---|---|---|
| 1 | `20260719_01_security_helpers.sql` | Adds `is_admin()` and the role-escalation trigger. No behaviour change on its own. |
| 2 | `20260719_02_enable_rls.sql` | **Turns on RLS.** This is the one that can break the app. |
| 3 | `20260719_03_harden_rpcs.sql` | Fixes the RPCs and the signup trigger. |
| 4 | `20260719_04_storage.sql` | Makes the evidence bucket private. Requires the app deploy below. |
| 5 | `20260719_05_drop_legacy_policies.sql` | Drops the dashboard-created policies that were silently overriding everything in `02`. |

`01` must precede `02` — the policies call `is_admin()`.

### Why `05` is not optional

`02` alone is not enough on this project, and the failure is silent. The four
core tables were created through the Supabase dashboard, not from this repo, and
carried policies like `"Public profiles are viewable by everyone"` that appear in
no `.sql` file here. Postgres OR's permissive policies together, so a single
leftover `USING (true)` defeats every restrictive policy beside it. After `02`
the diagnostics looked perfect — RLS on, all 12 new policies present — while the
anon key still returned the full user table.

Verified after `05` (2026-07-19): `users`, `pallets`, `transactions` and
`departments` all return `[]` with `Content-Range: */0` for anon.
`system_settings` still returns its 7 non-secret keys, which is required — the
login screen reads `admin_email_base` before the user is authenticated.

If you ever add tables through the dashboard, re-run `DIAGNOSE.sql` and check for
policy names outside the new naming scheme.

### Before running `02`

Confirm your own account is an admin, or you will lock yourself out of every
admin screen:

```sql
select id, employee_id, full_name, role from public.users order by role;
```

If your row is not `admin`, fix it first (the SQL editor runs as `service_role`,
which bypasses RLS and the new trigger):

```sql
update public.users set role = 'admin' where employee_id = '<your id>';
```

### After running `02`

Re-run the probe from outside the app. Every table must now return nothing:

```bash
curl -s -o /dev/null -w "%{http_code} " \
  "$SUPABASE_URL/rest/v1/users?select=id" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
```

A `200` with an empty array `[]` is the expected, correct result — RLS filters
rows rather than refusing the request.

Then smoke-test in the app: sign in as admin (user list loads), sign in as staff
(mobile home loads, own history visible), scan a check-out, scan a check-in.

If anything breaks, `20260719_99_ROLLBACK.sql` disables RLS again and lists the
four most likely causes. It intentionally does **not** revert `03`.

## Deploy the app at the same time

The SQL and the app changes are a matched pair. These app changes are required:

- `services/transactionService.ts` — `checkOutPallet` now uses `.update()`
  instead of `.upsert()`. Pallet `INSERT` is admin-only after `02`, so the old
  upsert would fail its policy check. This also stops an unrecognised QR code
  from silently creating inventory.
- `services/storageService.ts` (new) — mints short-lived signed URLs. Required
  by `04`; without it every evidence image 404s.
- `services/authService.ts` — `createAccountByAdmin` no longer passes `role` in
  signup metadata and calls `admin_set_role()` afterwards instead. Without this,
  creating an admin account silently produces a staff account after `03`.
- `services/userService.ts` — removed the fallback that re-queried
  `public.users` whenever `get_users_with_auth()` returned "Access denied",
  which defeated that function's admin gate entirely.
- `services/reportService.ts` — no longer sends LINE messages from the browser
  through `corsproxy.io`. See below.
- `components/LoginPage.tsx` — stops writing the user's password to
  `localStorage`, and the forgot-password screen no longer lists every admin.

## Edge function

`scheduled-report` is deployed with `--no-verify-jwt` and was completely
unauthenticated. It now requires either:

- header `x-report-secret: <REPORT_TRIGGER_SECRET>` (the cron job), or
- a bearer token belonging to a user whose `public.users.role` is `admin`
  (the "Test send" buttons in Settings).

**It fails closed**: if `REPORT_TRIGGER_SECRET` is unset the function returns
500 and sends nothing. Set it before redeploying:

```bash
# generate a secret
openssl rand -hex 32

npx supabase secrets set REPORT_TRIGGER_SECRET=<value>
npx supabase functions deploy scheduled-report --no-verify-jwt
```

Then add the header to the existing cron job. If it was created through the
dashboard UI, edit the job and add `x-report-secret`. If it was created with
`cron.schedule` + `net.http_post`, update the headers argument:

```sql
select cron.unschedule('invoke-report-hourly');

select cron.schedule(
  'invoke-report-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url     := 'https://<project>.supabase.co/functions/v1/scheduled-report',
    headers := '{"Content-Type":"application/json","x-report-secret":"<value>"}'::jsonb
  );
  $$
);
```

## Also do these in the dashboard

1. **Rotate the LINE channel access token.** It was being sent to `corsproxy.io`
   on every browser-side report attempt. Treat it as disclosed.
2. **Disable email sign-ups** (Authentication → Providers → Email) unless you
   genuinely need self-service registration. After `03` a self-registered user
   can only ever be `staff`, but there is still no reason to let the anon key
   create accounts. Account creation belongs in the admin screen.
3. **Consider rotating the anon key** if the site has been publicly reachable.
   It is designed to be public, so this is optional — the real fix is the RLS
   above — but it invalidates any copies already taken.

## Known behaviour change

`delete_user_complete()` now refuses to delete a user who has transaction
history, rather than either failing with an opaque foreign-key error or silently
cascading the audit trail away (which of the two happened depended on how the FK
was declared in the dashboard — the repo has no DDL for it). If you need to
remove such a user, decide explicitly what should happen to their history first.
