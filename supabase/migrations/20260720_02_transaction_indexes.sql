-- =============================================================================
-- Indexes for public.transactions.
--
-- The table had no index at all beyond its primary key, yet every read filters
-- on user_id or pallet_id and orders by timestamp desc -- and the RLS policy
-- transactions_select_own_or_admin filters on user_id on top of that, so the
-- filter runs on every single row a staff user reads. At 53 rows nothing is
-- noticeable; this is simply the first place the system will slow down.
--
-- Each index leads with the equality column and follows with the sort column,
-- so the matching query is one index range scan with no separate sort step.
--
-- CONCURRENTLY is deliberately not used: at this data size the build is
-- instant, and CONCURRENTLY cannot run inside a transaction block.
--
-- Safe to run against a live database ahead of the app deploy -- adding an
-- index changes no behaviour.
--
-- Re-runnable: IF NOT EXISTS throughout.
-- =============================================================================

begin;

-- fetchPalletHistory, the latest-damage-report lookup in transactionService,
-- the latest-transaction sync in updateTransaction, and the chunked CSV export.
create index if not exists idx_transactions_pallet_ts
    on public.transactions (pallet_id, timestamp desc);

-- fetchUserTransactions, fetchUserTransactionDates, and the USING clause of
-- policy transactions_select_own_or_admin.
create index if not exists idx_transactions_user_ts
    on public.transactions (user_id, timestamp desc);

-- fetchTransactions (no filter, ordered only) and cleanupOldData's
-- `timestamp < cutoff` delete.
create index if not exists idx_transactions_ts
    on public.transactions (timestamp desc);

commit;
