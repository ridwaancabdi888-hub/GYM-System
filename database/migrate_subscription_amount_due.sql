-- ============================================================================
-- Migration: adds subscriptions.amount_due (needed for automatic payment
-- status: Pending / Unpaid / Partially Paid / Paid).
--
-- Run this ONCE in the Supabase SQL Editor against the existing database.
-- It is NOT needed for a brand new database — schema.sql already has it.
--
-- What it does:
--   1. Adds the amount_due column.
--   2. Backfills it for every existing subscription from its plan's
--      CURRENT price (best available approximation for past cycles that
--      predate this column — new subscriptions snapshot the price going
--      forward, so this only affects already-existing rows).
-- ============================================================================

alter table subscriptions add column if not exists amount_due numeric(10,2) not null default 0;

update subscriptions s
set amount_due = p.price
from membership_plans p
where s.plan_id = p.id
  and s.amount_due = 0;
