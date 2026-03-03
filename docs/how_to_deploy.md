# How to Deploy Scheduled Reports

This guide aligns with the [Supabase Edge Functions Quickstart](https://supabase.com/docs/guides/functions/quickstart).

## 1. Prerequisites (Install CLI locally)
Supabase now recommends installing the CLI nicely inside your project.
- Open your terminal in the project folder.
- Run:
```bash
npm install -D supabase
```

## 2. Login to Supabase
Run (and follow browser instructions):
```bash
npx supabase login
```

## 3. Apply the Code (Skip "functions new")
*The official guide says to run `supabase functions new`. I have already created the code for you in `supabase/functions/scheduled-report/index.ts`, so you can skipping creating a new one.*

## 4. Test Locally (Optional - Requires Docker)
*Note: This step requires **Docker Desktop** to be installed and running. If you don't have Docker, please **SKIP** to Step 5.*

Before deploying, you can test if it runs on your machine.
1. Run local server:
```bash
npx supabase start
```
2. Serve the function:
```bash
npx supabase functions serve scheduled-report --no-verify-jwt
```
3. In a new terminal, test it (simulating a request):
```bash
curl -i --location --request POST http://localhost:54321/functions/v1/scheduled-report
```
*Note: Make sure your local database has the `system_settings` table populated if you test locally.*

## 5. Link Your Project
You need your Supabase Project ID (found in Dashboard URL `https://supabase.com/dashboard/project/<project-id>`).
- Run:
```bash
npx supabase link --project-ref your-project-id
```
*(Enter your Database Password if prompted)*

## 6. Deploy to Production
Run this command to push the code to the cloud:
```bash
npx supabase functions deploy scheduled-report --no-verify-jwt
```
*(We use `--no-verify-jwt` because the scheduler (cron) invokes it without a user session. Ensure validation checks inside the code if you want strict security, though our code checks for Time settings safely.)*

## 7. Set Up the Schedule
Now, tell Supabase to run this function every hour.
1. Go to your **Supabase Dashboard** (in the browser).
2. On the left sidebar, click **Integrations**.
3. Select **Cron** (or "Cron Postgres Module").
4. Click **Enable pg_cron** (green button). *This is required first!*
5. Once enabled, click **Create a new Cron Job**.
6. Fill in the form:
   - **Name**: `invoke-report-hourly`
   - **Schedule**: `0 * * * *` (This means every hour, at minute 0).
   - **Type**: Select **HTTP Request**.
   - **Method**: `POST`
   - **URL**: Your Edge Function URL.
     - *To find this URL*: Go to **Edge Functions** (sidebar) -> click `scheduled-report` -> Copy the URL (e.g. `https://xyz.supabase.co/functions/v1/scheduled-report`).
   - **HTTP Headers**: Add one header:
     - Key: `Content-Type`
     - Value: `application/json`
7. Click **Create**.

*Alternative (SQL Method):*
If the UI above is not available, run this in the **SQL Editor**:
```sql
select
  cron.schedule(
    'invoke-report-hourly',
    '0 * * * *',
    $$
    select
      net.http_post(
          url => 'https://<project-ref>.supabase.co/functions/v1/scheduled-report',
          headers => '{"Content-Type": "application/json"}'::jsonb
      ) as request_id;
    $$
  );
```
*(Replace `<project-ref>` with your actual Project ID)*.
